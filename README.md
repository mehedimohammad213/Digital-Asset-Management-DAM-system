# DAM Automation

Playwright + TypeScript test suite for the **Digital Asset Management (DAM)** QA environment.

This project is organized so a junior QA engineer can find code quickly: tests are grouped by purpose (smoke vs. journeys), and shared code lives under `src/`.

## Quick Start

```bash
npm install
npx playwright install chromium
cp .env.example .env   # add your credentials
npm test
```

## Environment Variables

Edit `.env` (never commit it):

| Variable             | Description                                       |
| -------------------- | ------------------------------------------------- |
| `MARCOMBOX_EMAIL`    | Login email                                       |
| `MARCOMBOX_PASSWORD` | Login password                                    |
| `MARCOMBOX_BASE_URL` | App URL (default: `https://qatest.marcombox.com`) |
| `TEST_EMAIL`         | Inbox for guest-upload emails (Yopmail OK)        |
| `SHARE_EMAIL`        | Recipient for asset share emails (default: Gmail) |

## Running Tests

```bash
npm test                    # Full suite
npm run test:smoke          # Fast checks (~2 min)
npm run test:regression     # Full business journeys
npm run test:local-upload   # Journey 1: upload mp4 lifecycle
npm run test:guest-upload   # Journey 2: guest upload via email
npm run test:headed         # Debug with visible browser
npm run report              # Open HTML report
```

## Project Structure

```
src/                          # All reusable automation code
├── config/
│   └── environment.ts        # Reads .env credentials
├── fixtures/
│   └── base.fixture.ts       # Injects pages + env into tests
├── pages/                              # Page Object Model (UI actions)
│   ├── login.page.ts
│   ├── assets.page.ts
│   ├── asset-detail.page.ts
│   └── guest-upload.page.ts
└── support/                            # Shared helpers
    ├── asset-cleanup.ts
    ├── asset-prefixes.ts
    ├── email.ts
    ├── step-runner.ts
    ├── test-data.ts
    └── yopmail.ts

tests/
├── smoke/                    # Fast, critical-path checks
│   ├── api-health.spec.ts
│   └── login.spec.ts
└── journeys/                 # End-to-end business flows
    ├── local-upload.spec.ts
    └── guest-upload.spec.ts

test-data/                    # Sample files for uploads
global-setup.ts               # Logs in once, saves session
docs/TEST_STRATEGY.md                   # Scope, tags, risks
```

## Where to Change What

| Task                     | File to edit                        |
| ------------------------ | ----------------------------------- |
| Add a new UI action      | `src/pages/*.page.ts`               |
| Change login / env setup | `src/config/environment.ts`         |
| Add a new test           | `tests/smoke/` or `tests/journeys/` |
| Email / Yopmail logic    | `src/support/email.ts`              |
| Safe asset cleanup rules | `src/support/asset-prefixes.ts`     |
| Change DAM user folder   | `src/support/test-data.ts` (`USER_FOLDER`) |

Import project code using the `@src/` alias:

```typescript
import { test, expect } from '@src/fixtures/base.fixture';
import { AssetsPage } from '@src/pages/assets.page';
```

## Test Journeys

### Local upload (`local-upload.spec.ts`) — `@smoke @regression`

Sign in → upload `.mp4` → fill metadata → edit → search → download → share via email → delete → logout.

### Guest upload (`guest-upload.spec.ts`) — `@regression`

Sign in → send guest upload invite → open link + OTP from email → upload `.jpg` → verify in DAM → delete → logout.

See [docs/TEST_STRATEGY.md](./docs/TEST_STRATEGY.md) for tags, CI, and risk register.

## Code Quality

```bash
npm run validate    # typecheck + lint + format check
```

## Docker & CI

```bash
npm run docker:build && npm run docker:test
```

GitHub Actions runs on every push/PR to `main`. Configure repository secrets: `MARCOMBOX_EMAIL`, `MARCOMBOX_PASSWORD`, `MARCOMBOX_BASE_URL`, `TEST_EMAIL`, `SHARE_EMAIL`.

## Assumptions

- DAM folder `mehedi` must exist in Assets (change `USER_FOLDER` in `src/support/test-data.ts` if needed)
- Yopmail inbox must be accessible for email steps
- Video processing may take up to 3 minutes on slow networks
