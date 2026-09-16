import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { BadRequest, NotFound, Forbidden, Conflict } from '../middleware/errorHandler.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// ========== Razorpay Client ==========
let razorpayInstance: any = null;

function getRazorpay(): any {
  if (razorpayInstance) {
    return razorpayInstance;
  }
  
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file.');
    (err as any).statusCode = 503;
    throw err;
  }
  
  razorpayInstance = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  
  return razorpayInstance;
}

// ========== Validation Schemas ==========

const createOrderSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
}).strict();

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
}).strict();

// ========== Helper Functions ==========

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Razorpay Key Secret not configured.');
    (err as any).statusCode = 503;
    throw err;
  }
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}

// ========== Controllers ==========

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createOrderSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', input.booking_id)
      .single();

    if (bookingError || !booking) {
      throw NotFound('Booking not found.');
    }

    // Verify booking belongs to user
    if (booking.user_id !== userId) {
      throw Forbidden('You do not have permission to pay for this booking.');
    }

    // Verify booking is payable
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      throw BadRequest('Cannot pay for a cancelled or rejected booking.');
    }

    // Check if payment already exists and is successful
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', input.booking_id)
      .eq('status', 'success')
      .single();

    if (existingPayment) {
      throw Conflict('Payment already completed for this booking.');
    }

    // Amount is in paise (Razorpay uses smallest currency unit)
    const amountInPaise = booking.total_amount * 100;

    // Create Razorpay order
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: booking.booking_code,
      notes: {
        booking_id: booking.id,
        user_id: userId,
      },
    });

    // Store payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        booking_id: booking.id,
        payment_type: 'booking',
        amount: booking.total_amount,
        currency: 'INR',
        razorpay_order_id: order.id,
        status: 'created',
      });

    if (paymentError) {
      throw paymentError;
    }

    res.status(201).json({
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: env.RAZORPAY_KEY_ID,
        booking_code: booking.booking_code,
      },
      message: 'Order created successfully',
    });
  } catch (err: any) {
    next(err);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifyPaymentSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    console.log('[VERIFY DEBUG] verifyPayment called');
    console.log('[VERIFY DEBUG] order_id:', input.razorpay_order_id);
    console.log('[VERIFY DEBUG] payment_id:', input.razorpay_payment_id);
    console.log('[VERIFY DEBUG] signature present:', !!input.razorpay_signature);
    console.log('[VERIFY DEBUG] user_id:', userId);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', input.razorpay_order_id)
      .single();

    if (paymentError || !payment) {
      console.log('[VERIFY DEBUG] Payment record not found:', paymentError?.message);
      throw NotFound('Payment record not found.');
    }

    console.log('[VERIFY DEBUG] Payment record found, status:', payment.status);
    console.log('[VERIFY DEBUG] Payment user_id:', payment.user_id);

    if (payment.user_id !== userId) {
      console.log('[VERIFY DEBUG] User mismatch! payment.user_id:', payment.user_id, 'req user:', userId);
      throw Forbidden('You do not have permission to verify this payment.');
    }

    if (payment.status === 'success') {
      console.log('[VERIFY DEBUG] Payment already verified');
      res.status(200).json({
        data: { payment_id: payment.razorpay_payment_id, status: 'success' },
        message: 'Payment already verified.',
      });
      return;
    }

    const isValid = verifyRazorpaySignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature
    );

    console.log('[VERIFY DEBUG] Signature valid:', isValid);

    if (!isValid) {
      console.log('[VERIFY DEBUG] Invalid signature - marking payment as failed');
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      throw BadRequest('Invalid payment signature. Payment verification failed.');
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
        status: 'success',
        payment_method: 'razorpay',
      })
      .eq('id', payment.id);

    if (updateError) {
      console.log('[VERIFY DEBUG] Payment update error:', updateError.message);
      throw updateError;
    }

    console.log('[VERIFY DEBUG] Payment updated to success, updating booking');
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', payment.booking_id);

    console.log('[VERIFY DEBUG] Booking updated to confirmed');
    res.status(200).json({
      data: {
        payment_id: input.razorpay_payment_id,
        order_id: input.razorpay_order_id,
        status: 'success',
      },
      message: 'Payment verified successfully.',
    });
  } catch (err: any) {
    console.error('[VERIFY DEBUG] verifyPayment error:', err.message);
    console.error('[VERIFY DEBUG] error stack:', err.stack);
    next(err);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    const rawBody = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body));

    let isValid = false;
    try {
      isValid = verifyWebhookSignature(rawBody, signature);
    } catch {
      console.warn('[WEBHOOK] Webhook secret not configured, skipping verification');
    }

    if (!isValid && env.RAZORPAY_WEBHOOK_SECRET) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    let payload: any;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
    } catch {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }

    const event = payload.event;
    const paymentPayload = payload.payload;
    const supabase = getSupabase();

    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        const orderId = paymentPayload?.payment?.entity?.order_id || paymentPayload?.order?.entity?.id;
        const paymentId = paymentPayload?.payment?.entity?.id;

        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('razorpay_order_id', orderId)
          .single();

        if (payment && payment.status !== 'success') {
          await supabase
            .from('payments')
            .update({
              razorpay_payment_id: paymentId,
              status: 'success',
              payment_method: 'razorpay',
            })
            .eq('id', payment.id);

          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);
        }
        break;
      }
      case 'payment.failed': {
        const orderId = paymentPayload?.payment?.entity?.order_id;

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', orderId);
        break;
      }
      default:
        break;
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { booking_id } = req.params;
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, user_id')
      .eq('id', booking_id)
      .single();

    if (!booking || booking.user_id !== userId) {
      throw Forbidden('Access denied.');
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.status(200).json({
      data: payment || null,
    });
  } catch (err) {
    next(err);
  }
}

export { createOrderSchema, verifyPaymentSchema };
