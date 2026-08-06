import { YopmailBrowserClient, YopmailClient } from './yopmail';

type EmailWaitOptions = {
  bodyContains?: string;
  bodyMatches?: RegExp;
  since: Date;
  timeoutMs?: number;
  subjectContains?: string;
};

/** Prefer API polling; fall back to browser inbox when HTML parsing fails. */
export async function waitForEmailWithFallback(
  api: YopmailClient,
  browserClient: YopmailBrowserClient,
  options: EmailWaitOptions,
): Promise<{ body: string; link?: string }> {
  try {
    const mail = await api.waitForEmail({
      bodyContains: options.bodyContains,
      bodyMatches: options.bodyMatches,
      since: options.since,
      timeoutMs: Math.min(options.timeoutMs ?? 120_000, 60_000),
      subjectContains: options.subjectContains,
    });
    return { body: mail.body, link: mail.link };
  } catch {
    return browserClient.waitForEmail({
      bodyContains: options.bodyContains,
      bodyMatches: options.bodyMatches,
      since: options.since,
      timeoutMs: options.timeoutMs ?? 120_000,
    });
  }
}

export function extractOtpFromBody(body: string): string {
  const match = body.match(/\b(\d{4,8})\b/);
  if (!match) throw new Error('OTP not found in email body');
  return match[1];
}
