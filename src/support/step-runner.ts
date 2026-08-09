import { Page, test } from '@playwright/test';

export interface StepFailure {
  step: string;
  message: string;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Run journey steps independently — failures are recorded and remaining steps still run. */
export class StepRunner {
  readonly failures: StepFailure[] = [];

  constructor(
    private readonly page: Page,
    private readonly holdMsOnFailure = 2000,
  ) {}

  async run(stepName: string, fn: () => Promise<void>): Promise<void> {
    await test.step(stepName, async () => {
      try {
        await fn();
      } catch (error) {
        const message = formatError(error);
        this.failures.push({ step: stepName, message });

        await test.info().attach(`failed: ${stepName}`, {
          body: message,
          contentType: 'text/plain',
        });

        await this.page
          .screenshot({ path: `test-results/failed-${sanitizeFileName(stepName)}.png` })
          .catch(() => undefined);

        if (this.holdMsOnFailure > 0) {
          await this.page.waitForTimeout(this.holdMsOnFailure);
        }
      }
    });
  }

  assertAllPassed(): void {
    if (this.failures.length === 0) return;

    const summary = this.failures
      .map(({ step, message }, index) => `${index + 1}. ${step}\n   ${message}`)
      .join('\n\n');

    throw new Error(
      `${this.failures.length} step(s) failed (remaining steps were still executed):\n\n${summary}`,
    );
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 80);
}
