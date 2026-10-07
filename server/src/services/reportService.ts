import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';

const createReportSchema = z.object({
  reported_id: z.string().uuid('Invalid reported user ID').optional(),
  category: z.enum(['safety_concern', 'harassment', 'non_platonic_behavior', 'unpunctual', 'commercial_services', 'other']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  booking_id: z.string().uuid('Invalid booking ID').optional(),
}).strict();

export async function createReport(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createReportSchema.parse(req.body);
    const reporterId = req.user!.id;
    const supabase = getSupabase();

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_id: input.reported_id || 'usr-unknown',
        category: input.category,
        description: input.description,
        booking_id: input.booking_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      data: report,
      message: 'Report submitted successfully. Our safety team will review it.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getReports(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      data: reports || [],
      count: reports?.length || 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateReportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']),
    }).parse(req.body);

    const supabase = getSupabase();
    const { data: report, error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      data: report,
      message: `Report status updated to '${status}'`,
    });
  } catch (err) {
    next(err);
  }
}

export { createReportSchema };
