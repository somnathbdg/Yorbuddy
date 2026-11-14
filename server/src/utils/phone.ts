/**
 * Canonicalize Indian mobile numbers to their 10-digit national form.
 */
import { BadRequest } from '../middleware/errorHandler.js';

export function normalizeIndianPhone(value: string): string {
  const digits = String(value || '').replace(/\\D/g, '');
  let national = digits;
  if (national.length === 12 && national.startsWith('91')) national = national.slice(2);
  else if (national.length === 11 && national.startsWith('0')) national = national.slice(1);
  if (!/^[6-9]\\d{9}$/.test(national)) throw BadRequest('Enter a valid 10-digit Indian mobile number.');
  return national;
}
