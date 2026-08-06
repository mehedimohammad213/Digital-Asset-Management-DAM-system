import { APIRequestContext, Page } from '@playwright/test';
import { yopmailUsername } from './testData';

const YOPMAIL_BASE = 'https://yopmail.com';

export class YopmailClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly email: string,
  ) {}

  private get username(): string {
    return yopmailUsername(this.email);
  }

  /** Poll Yopmail inbox until a matching email arrives after `since`. */
  async waitForEmail(options: {
    subjectContains?: string;
    bodyContains: string;
    since: Date;
    timeoutMs?: number;
    pollIntervalMs?: number;
  }): Promise<{ subject: string; body: string; link?: string }> {
    const {
      subjectContains,
      bodyContains,
      since,
      timeoutMs = 120_000,
      pollIntervalMs = 5_000,
    } = options;

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const messages = await this.fetchInboxMessages();
      for (const msg of messages) {
        if (subjectContains && !msg.subject.toLowerCase().includes(subjectContains.toLowerCase())) {
          continue;
        }
        const body = await this.fetchMessageBody(msg.id);
        if (!body.includes(bodyContains)) continue;

        const linkMatch = body.match(/https?:\/\/[^\s"'<>]+/g);
        const link = linkMatch?.find((url) => url.includes('marcombox') || url.includes('guest'));

        return { subject: msg.subject, body, link };
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(
      `Email not found within ${timeoutMs}ms (body must contain "${bodyContains}")`,
    );
  }

  /** Extract OTP code (4-8 digit numeric) from email body. */
  extractOtp(body: string): string {
    const match = body.match(/\b(\d{4,8})\b/);
    if (!match) throw new Error('OTP not found in email body');
    return match[1];
  }

  private async fetchInboxMessages(): Promise<Array<{ id: string; subject: string }>> {
    const response = await this.request.get(`${YOPMAIL_BASE}/en/inbox`, {
      params: { login: this.username, p: '1' },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await response.text();

    const messages: Array<{ id: string; subject: string }> = [];
    const rowRegex = /class="m"[^>]*onclick="[^"]*\/en\/mail\?[^"]*id=([^&"]+)[^"]*"[^>]*>([^<]+)</gi;
    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      messages.push({ id: match[1], subject: match[2].trim() });
    }

    if (messages.length === 0) {
      const altRegex = /id=([a-z0-9]+)[^>]*>([^<]{5,100})</gi;
      while ((match = altRegex.exec(html)) !== null) {
        if (match[2].includes('@') || match[2].length < 5) continue;
        messages.push({ id: match[1], subject: match[2].trim() });
      }
    }

    return messages;
  }

  private async fetchMessageBody(mailId: string): Promise<string> {
    const response = await this.request.get(`${YOPMAIL_BASE}/en/mail`, {
      params: { b: this.username, id: mailId },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return response.text();
  }
}

/** Browser-based Yopmail reader (fallback when API parsing fails). */
export class YopmailBrowserClient {
  constructor(
    private readonly page: Page,
    private readonly email: string,
  ) {}

  private get username(): string {
    return yopmailUsername(this.email);
  }

  async waitForEmail(options: {
    bodyContains: string;
    since: Date;
    timeoutMs?: number;
  }): Promise<{ body: string; link?: string }> {
    const { bodyContains, timeoutMs = 120_000 } = options;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.page.goto(`https://yopmail.com/en/wm?login=${this.username}&p=1`);
      await this.page.waitForTimeout(2000);

      const inboxFrame = this.page.frameLocator('#ifinbox');
      const mailLinks = inboxFrame.locator('.m, div.m, [onclick*="mail"]');
      const count = await mailLinks.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        await mailLinks.nth(i).click();
        await this.page.waitForTimeout(1500);

        const mailFrame = this.page.frameLocator('#ifmail');
        const body = await mailFrame.locator('body').innerText().catch(() => '');

        if (body.includes(bodyContains)) {
          const linkMatch = body.match(/https?:\/\/[^\s]+/g);
          const link = linkMatch?.find((u) => u.includes('marcombox') || u.includes('guest'));
          return { body, link };
        }

        await this.page.goto(`https://yopmail.com/en/wm?login=${this.username}&p=1`);
        await this.page.waitForTimeout(1000);
      }

      await this.page.waitForTimeout(5000);
    }

    throw new Error(`Email containing "${bodyContains}" not found within ${timeoutMs}ms`);
  }

  extractOtp(body: string): string {
    const match = body.match(/\b(\d{4,8})\b/);
    if (!match) throw new Error('OTP not found in email body');
    return match[1];
  }
}
