import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';
import { BadRequest, NotFound, Forbidden } from '../middleware/errorHandler.js';
import crypto from 'crypto';

// ========== Types ==========

interface VerificationStatus {
  email: 'unverified' | 'verified';
  phone: 'unverified' | 'verified';
  kyc: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  kyc_rejection_reason?: string;
  is_fully_verified: boolean;
}

// ========== Validation Schemas ==========

const requestEmailCodeSchema = z.object({
  // No body needed — user is identified from token
}).strict();

const verifyEmailCodeSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
}).strict();

const requestPhoneCodeSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+?\d{10,15}$/, 'Invalid phone format'),
}).strict();

const verifyPhoneCodeSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
}).strict();

const submitKycSchema = z.object({
  doc_type: z.enum(['aadhaar', 'pan', 'passport', 'voter_id']),
  doc_front_url: z.string().url('Invalid document URL').max(500),
  selfie_url: z.string().url('Invalid selfie URL').max(500),
}).strict();

const rejectKycSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500),
}).strict();

const kycIdParamSchema = z.object({
  id: z.string().uuid('Invalid KYC ID format'),
});

// ========== Database-Backed Verification Code Store ==========
// Codes are stored hashed in the database with expiration and one-time-use behavior.

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function storeCode(supabase: any, key: string, code: string, ttlMs: number = 10 * 60 * 1000): Promise<void> {
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  
  // Store hashed code in database
  await supabase.from('verification_codes').insert({
    key: key,
    code_hash: codeHash,
    expires_at: expiresAt,
    used_at: null,
  });
}

async function verifyCode(supabase: any, key: string, providedCode: string): Promise<boolean> {
  const codeHash = hashCode(providedCode);
  
  const { data: records, error } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('key', key)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !records || records.length === 0) return false;
  
  const record = records[0];
  
  // Check expiration
  if (new Date(record.expires_at) < new Date()) {
    return false;
  }
  
  // Mark as used (one-time use)
  await supabase
    .from('verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', record.id);
  
  return true;
}

// ========== Helper: Get user verification status ==========

async function getUserVerificationStatus(supabase: any, userId: string): Promise<VerificationStatus> {
  const { data: user, error } = await supabase
    .from('users')
    .select('email_verified_at, phone_verified_at')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw NotFound('User not found.');
  }

  // Get latest KYC status
  const { data: kycRows } = await supabase
    .from('verifications')
    .select('status, rejection_reason')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false, nullsLast: true })
    .limit(1);

  let kyc: VerificationStatus['kyc'] = 'not_submitted';
  let kycRejectionReason: string | undefined;

  if (kycRows && kycRows.length > 0) {
    // Map 'verified' to 'approved' for compatibility
    const rawStatus = kycRows[0].status;
    kyc = rawStatus === 'verified' ? 'approved' : rawStatus as VerificationStatus['kyc'];
    kycRejectionReason = kycRows[0].rejection_reason || undefined;
  }

  const emailStatus = user.email_verified_at ? 'verified' : 'unverified';
  const phoneStatus = user.phone_verified_at ? 'verified' : 'unverified';

  // Determine fully verified
  const isFullyVerified = emailStatus === 'verified' && phoneStatus === 'verified' && kyc === 'approved';

  return {
    email: emailStatus,
    phone: phoneStatus,
    kyc,
    ...(kycRejectionReason && { kyc_rejection_reason: kycRejectionReason }),
    is_fully_verified: isFullyVerified,
  };
}

// ========== Email Verification ==========

export async function requestEmailCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requestEmailCodeSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('email, email_verified_at')
      .eq('id', userId)
      .single();

    if (!user) {
      throw NotFound('User not found.');
    }

    if (user.email_verified_at) {
      throw BadRequest('Email is already verified.');
    }

    const code = generateCode();
    await storeCode(supabase, `email:${userId}`, code);

    // In production: send email via provider (SendGrid, AWS SES, etc.)
    // For development: log to console for testing convenience.
    // The verification code is NEVER returned in the API response.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Email verification code for ${user.email}: ${code}`);
    }

    res.status(200).json({
      message: 'Verification code sent to email.',
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifyEmailCodeSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    const isValid = await verifyCode(supabase, `email:${userId}`, input.code);
    if (!isValid) {
      throw BadRequest('Invalid or expired verification code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    // Also update profiles table for consistency
    await supabase
      .from('profiles')
      .update({ is_email_verified: true })
      .eq('user_id', userId);

    res.status(200).json({
      message: 'Email verified successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ========== Phone Verification ==========

export async function requestPhoneCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = requestPhoneCodeSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    // Update user's phone number if provided
    const { error: updateError } = await supabase
      .from('users')
      .update({ phone: input.phone })
      .eq('id', userId);

    if (updateError) {
      if (updateError.code === '23505') throw BadRequest('This phone number is already in use.');
      throw updateError;
    }

    const code = generateCode();
    await storeCode(supabase, `phone:${userId}`, code);

    // In production: send SMS via MSG91, Twilio, etc.
    // For development: log to console for testing convenience.
    // The verification code is NEVER returned in the API response.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Phone verification code for ${input.phone}: ${code}`);
    }

    res.status(200).json({
      message: 'Verification code sent to phone.',
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifyPhoneCodeSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    const isValid = await verifyCode(supabase, `phone:${userId}`, input.code);
    if (!isValid) {
      throw BadRequest('Invalid or expired verification code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_verified_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    // Also update profiles table for consistency
    await supabase
      .from('profiles')
      .update({ is_phone_verified: true })
      .eq('user_id', userId);

    res.status(200).json({
      message: 'Phone verified successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ========== Get Current User Verification Status ==========

export async function getMyVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const status = await getUserVerificationStatus(supabase, userId);

    res.status(200).json({
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

// ========== KYC Submission ==========

export async function submitKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = submitKycSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    // Check for existing pending KYC
    const { data: existing } = await supabase
      .from('verifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw BadRequest('You already have a pending KYC submission. Please wait for review.');
    }

    // Create KYC submission
    const { data: kyc, error } = await supabase
      .from('verifications')
      .insert({
        user_id: userId,
        doc_type: input.doc_type,
        doc_front_url: input.doc_front_url,
        selfie_url: input.selfie_url,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      data: {
        id: kyc.id,
        status: kyc.status,
        doc_type: kyc.doc_type,
        submitted_at: kyc.submitted_at,
      },
      message: 'KYC submitted successfully. Pending admin review.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyKycStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: kycRows, error } = await supabase
      .from('verifications')
      .select('id, doc_type, doc_front_url, selfie_url, status, rejection_reason, submitted_at, reviewed_at')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!kycRows || kycRows.length === 0) {
      res.status(200).json({
        data: null,
      });
      return;
    }

    const kyc = kycRows[0];
    res.status(200).json({
      data: {
        id: kyc.id,
        doc_type: kyc.doc_type,
        status: kyc.status === 'verified' ? 'approved' : kyc.status,
        rejection_reason: kyc.rejection_reason,
        submitted_at: kyc.submitted_at,
        reviewed_at: kyc.reviewed_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ========== Admin KYC Review ==========

export async function getPendingKyc(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = getSupabase();

    // First get pending KYC records
    const { data: kycList, error } = await supabase
      .from('verifications')
      .select(`
        id,
        user_id,
        doc_type,
        doc_front_url,
        selfie_url,
        status,
        rejection_reason,
        submitted_at,
        reviewed_at
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) throw error;

    if (!kycList || kycList.length === 0) {
      res.status(200).json({
        data: [],
        count: 0,
      });
      return;
    }

    // Get user details for each KYC record
    const userIds = kycList.map((k: any) => k.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .in('id', userIds);

    const safeList = (kycList || []).map((k: any) => ({
      id: k.id,
      user_id: k.user_id,
      doc_type: k.doc_type,
      status: k.status,
      submitted_at: k.submitted_at,
      user: users?.find((u: any) => u.id === k.user_id) || null,
    }));

    res.status(200).json({
      data: safeList,
      count: safeList.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getKycById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = kycIdParamSchema.parse(req.params);
    const supabase = getSupabase();

    const { data: kyc, error } = await supabase
      .from('verifications')
      .select(`
        id,
        user_id,
        doc_type,
        doc_front_url,
        selfie_url,
        status,
        rejection_reason,
        submitted_at,
        reviewed_at,
        reviewed_by
      `)
      .eq('id', id)
      .single();

    if (error || !kyc) {
      throw NotFound('KYC record not found.');
    }

    // Get user details separately
    const { data: userRow } = await supabase
      .from('users')
      .select('id, full_name, email, phone, email_verified_at, phone_verified_at')
      .eq('id', kyc.user_id)
      .single();

    const safeKyc = {
      id: kyc.id,
      user_id: kyc.user_id,
      doc_type: kyc.doc_type,
      doc_front_url: kyc.doc_front_url,
      selfie_url: kyc.selfie_url,
      status: kyc.status === 'verified' ? 'approved' : kyc.status,
      rejection_reason: kyc.rejection_reason,
      submitted_at: kyc.submitted_at,
      reviewed_at: kyc.reviewed_at,
      reviewed_by: kyc.reviewed_by,
      user: userRow ? {
        id: userRow.id,
        full_name: userRow.full_name,
        email: userRow.email,
        phone: userRow.phone,
        email_verified: !!userRow.email_verified_at,
        phone_verified: !!userRow.phone_verified_at,
      } : null,
    };

    res.status(200).json({
      data: safeKyc,
    });
  } catch (err) {
    next(err);
  }
}

export async function approveKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = kycIdParamSchema.parse(req.params);
    const adminId = req.user!.id;
    const supabase = getSupabase();

    // Fetch the KYC record
    const { data: kyc, error: fetchError } = await supabase
      .from('verifications')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !kyc) {
      throw NotFound('KYC record not found.');
    }

    // Cannot approve own KYC
    if (kyc.user_id === adminId) {
      throw Forbidden('You cannot approve your own KYC submission.');
    }

    if (kyc.status !== 'pending') {
      throw BadRequest(`Cannot approve KYC with status '${kyc.status}'. Only pending KYC can be approved.`);
    }

    const { data: updated, error } = await supabase
      .from('verifications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If user has an existing buddy_profiles row, sync verification status
    // so they appear in verified buddy search (existing application convention)
    // Do NOT create a buddy_profiles row — user must complete "Become a Buddy" first
    const { data: existingBuddyProfile } = await supabase
      .from('buddy_profiles')
      .select('id')
      .eq('user_id', kyc.user_id)
      .single();

    if (existingBuddyProfile) {
      await supabase
        .from('buddy_profiles')
        .update({ verification_status: 'approved', is_verified: true })
        .eq('user_id', kyc.user_id);
    }

    res.status(200).json({
      data: {
        id: updated.id,
        status: updated.status,
        reviewed_at: updated.reviewed_at,
        reviewed_by: updated.reviewed_by,
      },
      message: 'KYC approved successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = kycIdParamSchema.parse(req.params);
    const input = rejectKycSchema.parse(req.body);
    const adminId = req.user!.id;
    const supabase = getSupabase();

    // Fetch the KYC record
    const { data: kyc, error: fetchError } = await supabase
      .from('verifications')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !kyc) {
      throw NotFound('KYC record not found.');
    }

    // Cannot reject own KYC
    if (kyc.user_id === adminId) {
      throw Forbidden('You cannot reject your own KYC submission.');
    }

    if (kyc.status !== 'pending') {
      throw BadRequest(`Cannot reject KYC with status '${kyc.status}'. Only pending KYC can be rejected.`);
    }

    const { data: updated, error } = await supabase
      .from('verifications')
      .update({
        status: 'rejected',
        rejection_reason: input.reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      data: {
        id: updated.id,
        status: updated.status,
        rejection_reason: updated.rejection_reason,
        reviewed_at: updated.reviewed_at,
        reviewed_by: updated.reviewed_by,
      },
      message: 'KYC rejected.',
    });
  } catch (err) {
    next(err);
  }
}

// ========== Admin Dashboard Stats ==========

export async function getVerifiedBuddies(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = getSupabase();

    // Get verified buddy profiles
    const { data: buddyProfiles, error } = await supabase
      .from('buddy_profiles')
      .select('id,user_id,hourly_rate,rating,review_count,supported_activity_ids,verification_status,is_verified,safety_pledge_signed,created_at')
      .eq('verification_status', 'approved')
      .eq('is_verified', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user and profile data separately
    const userIds = (buddyProfiles || []).map((bp: any) => bp.user_id);
    
    const { data: users } = await supabase
      .from('users')
      .select('id,full_name,email,role')
      .in('id', userIds);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id,photo_url,city,area,bio,interests')
      .in('user_id', userIds);

    // Map to safe response
    const safeList = (buddyProfiles || []).map((bp: any) => {
      const user = users?.find((u: any) => u.id === bp.user_id);
      const profile = profiles?.find((p: any) => p.user_id === bp.user_id);
      return {
        id: bp.id,
        user_id: bp.user_id,
        full_name: user?.full_name,
        email: user?.email,
        photo_url: profile?.photo_url,
        city: profile?.city,
        area: profile?.area,
        bio: profile?.bio,
        interests: profile?.interests || [],
        hourly_rate: bp.hourly_rate,
        rating: bp.rating,
        review_count: bp.review_count,
        supported_activity_ids: bp.supported_activity_ids || [],
        verification_status: bp.verification_status,
        is_verified: bp.is_verified,
        safety_pledge_signed: bp.safety_pledge_signed,
        verified_at: bp.created_at,
      };
    });

    res.status(200).json({
      data: safeList,
      count: safeList.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = getSupabase();

    // Count total members: all users except admins
    const { count: totalMembers, error: membersError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin');

    if (membersError) throw membersError;

    // Count verified buddies: buddy_profiles with verification_status = 'approved' AND is_verified = true
    const { count: verifiedBuddies, error: verifiedError } = await supabase
      .from('buddy_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'approved')
      .eq('is_verified', true);

    if (verifiedError) throw verifiedError;

    // Count total sessions (bookings)
    const { count: totalBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true });

    if (bookingsError) throw bookingsError;

    // Count pending KYC
    const { count: pendingKyc, error: pendingError } = await supabase
      .from('verifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    res.status(200).json({
      data: {
        total_members: totalMembers || 0,
        verified_buddies: verifiedBuddies || 0,
        total_bookings: totalBookings || 0,
        pending_kyc: pendingKyc || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ========== Export helper for use in other modules ==========

export async function isUserVerified(supabase: any, userId: string): Promise<boolean> {
  try {
    const status = await getUserVerificationStatus(supabase, userId);
    return status.is_fully_verified;
  } catch {
    return false;
  }
}

export { getUserVerificationStatus };
