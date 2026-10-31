import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { BadRequest, Forbidden } from '../middleware/errorHandler.js';

const BUCKET = 'kyc-documents';
const MAX_BYTES = 5 * 1024 * 1024;

const FILE_TYPES: Record<string, { extension: string; isValid: (bytes: Buffer) => boolean }> = {
  'image/jpeg': {
    extension: 'jpg',
    isValid: bytes => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    isValid: bytes => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  'application/pdf': {
    extension: 'pdf',
    isValid: bytes => bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-',
  },
};

/**
 * Uploads one KYC document or selfie to the private Storage bucket.
 *
 * Mount this handler with authenticate + verificationLimiter and
 * express.raw({ type: ['image/jpeg', 'image/png', 'application/pdf'], limit: '5mb' }).
 * This endpoint stores an opaque object path; it does not create a KYC record
 * or issue read URLs. The bucket must be private and configured separately.
 */
export async function uploadKycObject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const kind = req.params.kind;

    if (kind !== 'document' && kind !== 'selfie') {
      throw BadRequest('Invalid KYC file type.');
    }

    const mimeType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const fileType = FILE_TYPES[mimeType];

    if (!fileType || (kind === 'selfie' && mimeType === 'application/pdf')) {
      throw BadRequest('Unsupported KYC file format.');
    }

    const declaredLength = Number(req.headers['content-length']);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 1 || declaredLength > MAX_BYTES) {
      throw BadRequest('File must be between 1 byte and 5 MB.');
    }

    if (!Buffer.isBuffer(req.body)) {
      throw BadRequest('Expected a binary file upload.');
    }

    const bytes: Buffer = req.body;
    if (
      bytes.length !== declaredLength ||
      bytes.length < 1 ||
      bytes.length > MAX_BYTES ||
      !fileType.isValid(bytes)
    ) {
      throw BadRequest('Invalid file data or file signature.');
    }

    const supabase = getSupabase();
    const { data: pendingRows, error: pendingError } = await supabase
      .from('verifications')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (pendingError) throw pendingError;
    if (pendingRows?.length) {
      throw Forbidden('A KYC review is already pending.');
    }

    const objectPath = `${userId}/${crypto.randomUUID()}/${kind}.${fileType.extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, {
        contentType: mimeType,
        cacheControl: '0',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    res.status(201).json({
      data: { object_path: objectPath, kind },
      message: 'KYC file uploaded. Complete submission to send it for review.',
    });
  } catch (error) {
    next(error);
  }
}
