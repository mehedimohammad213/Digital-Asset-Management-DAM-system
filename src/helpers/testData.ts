export function uniqueTestId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function yopmailUsername(email: string): string {
  return email.split('@')[0];
}

export const SCENARIO1_PREFIX = 'S1-VIDEO';
export const SCENARIO2_PREFIX = 'S2-IMAGE';
