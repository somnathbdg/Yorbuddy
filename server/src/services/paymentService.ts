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

    // Verify booking is not expired
    if (booking.status === 'expired') {
      throw BadRequest('This booking has expired. Please create a new booking.');
    }

    // Check if pending booking has passed its expires_at timestamp
    if (booking.status === 'pending' && booking.expires_at && new Date(booking.expires_at) < new Date()) {
      // Auto-expire the booking
      await supabase
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', booking.id);
      throw BadRequest('This booking has expired. Please create a new booking.');
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

    // Check for any pending payment (idempotency - reuse existing order)
    const { data: pendingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', input.booking_id)
      .eq('status', 'created')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pendingPayment) {
      // Return existing pending order instead of creating a new one
      res.status(200).json({
        data: {
          order_id: pendingPayment.razorpay_order_id,
          amount: booking.total_amount * 100,
          currency: 'INR',
          key_id: env.RAZORPAY_KEY_ID,
          booking_code: booking.booking_code,
        },
        message: 'Existing order reused.',
      });
      return;
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

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', input.razorpay_order_id)
      .single();

    if (paymentError || !payment) {
      throw NotFound('Payment record not found.');
    }

    if (payment.user_id !== userId) {
      throw Forbidden('You do not have permission to verify this payment.');
    }

    if (payment.status === 'success') {
      res.status(200).json({
        data: { payment_id: payment.razorpay_payment_id, status: 'success' },
        message: 'Payment already verified.',
      });
      return;
    }

    // Fetch the booking to check if it's expired before confirming
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', payment.booking_id)
      .single();

    if (bookingFetchError || !booking) {
      throw NotFound('Associated booking not found.');
    }

    if (booking.status === 'expired') {
      throw BadRequest('Cannot confirm payment for an expired booking.');
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      throw BadRequest('Cannot confirm payment for a cancelled or rejected booking.');
    }

    const isValid = verifyRazorpaySignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature
    );

    if (!isValid) {
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
      throw updateError;
    }

    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', payment.booking_id);

    res.status(200).json({
      data: {
        payment_id: input.razorpay_payment_id,
        order_id: input.razorpay_order_id,
        status: 'success',
      },
      message: 'Payment verified successfully.',
    });
  } catch (err: any) {
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

    // Webhook secret must be configured in production
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] RAZORPAY_WEBHOOK_SECRET not configured. Webhook rejected.');
      res.status(400).json({ error: 'Webhook not configured' });
      return;
    }

    const rawBody = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body));

    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
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
