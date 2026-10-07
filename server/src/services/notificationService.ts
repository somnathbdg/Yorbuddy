import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';
import { NotFound, Forbidden } from '../middleware/errorHandler.js';

const createNotificationSchema = z.object({
  type: z.enum(['booking_accepted', 'booking_rejected', 'payment_success', 'upcoming_booking', 'new_message', 'review_received', 'verification_approved', 'account_warning']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
}).strict();

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.status(200).json({
      data: data || [],
      meta: {
        total: data?.length || 0,
        unread: data?.filter((n: any) => !n.is_read).length || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createNotificationSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: input.type,
        title: input.title,
        message: input.message,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      data,
      message: 'Notification created',
    });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: existing, error: fetchErr } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) throw NotFound('Notification not found.');
    if (existing.user_id !== userId) throw Forbidden('Access denied.');

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      data,
      message: 'Notification marked as read',
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.status(200).json({
      data: { unread: count || 0 },
    });
  } catch (err) {
    next(err);
  }
}

export { createNotificationSchema };
