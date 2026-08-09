import type { Response } from '@playwright/test';

const URL_KEYS = [
  'Link',
  'link',
  'Url',
  'url',
  'ShareLink',
  'shareLink',
  'GuestUploadLink',
  'guestUploadLink',
];

function findUrlInValue(value: unknown): string | undefined {
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findUrlInValue(item);
      if (url) return url;
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const url = findUrlInValue(nested);
      if (url) return url;
    }
  }

  return undefined;
}

/** Parse guest upload URL from POST /List/ShareLink response body. */
export async function extractGuestUploadUrl(response: Response): Promise<string | undefined> {
  try {
    const body = await response.json();

    for (const key of URL_KEYS) {
      const direct = (body as Record<string, unknown>)?.[key];
      const nested = (body as { data?: Record<string, unknown> })?.data?.[key];
      for (const candidate of [direct, nested]) {
        if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
          return candidate;
        }
      }
    }

    return findUrlInValue(body);
  } catch {
    const text = await response.text().catch(() => '');
    const match = text.match(/https?:\/\/[^\s"'<>]+/i);
    return match?.[0];
  }
}
