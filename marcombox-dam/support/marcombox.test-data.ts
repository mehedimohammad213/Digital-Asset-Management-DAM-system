export function uniqueMarcomboxTestId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function yopmailUsername(email: string): string {
  return email.split('@')[0];
}

export const MARCOMBOX_LOCAL_UPLOAD_PREFIX = 'S1-VIDEO';
export const MARCOMBOX_GUEST_UPLOAD_PREFIX = 'S2-IMAGE';
