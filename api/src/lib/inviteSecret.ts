import { randomBytes } from 'crypto';

/** URL-safe secret for /invite/:code (no ambiguous chars) */
export function generateInviteSecret(): string {
  return randomBytes(18).toString('base64url');
}
