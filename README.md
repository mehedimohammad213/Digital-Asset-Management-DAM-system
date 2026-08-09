# MarcomBox DAM Automation

Playwright + TypeScript test suite for the **MarcomBox Digital Asset Management (DAM)** QA environment.

This project is organized so a junior QA engineer can find code quickly: every folder and file is named after MarcomBox, and tests are grouped by purpose (smoke vs. journeys).

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
| `USER_FOLDER_NAME`   | Your folder in DAM > Assets (e.g. `mehedi`)       |
| `TEST_EMAIL`         | Inbox for share/guest-upload emails (Yopmail OK)  |

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

Legacy aliases `test:scenario1` and `test:scenario2` still work.

## Project Structure

```
marcombox-dam/                          # All reusable automation code
├── config/
│   └── marcombox.environment.ts        # Reads .env credentials
├── fixtures/
│   └── marcombox.fixture.ts            # Injects pages + env into tests
├── pages/                              # Page Object Model (UI actions)
│   ├── marcombox-login.page.ts
│   ├── marcombox-assets.page.ts
│   ├── marcombox-asset-detail.page.ts
│   └── marcombox-guest-upload.page.ts
└── support/                            # Shared helpers
    ├── marcombox.asset-cleanup.ts
    ├── marcombox.asset-prefixes.ts
    ├── marcombox.email.ts
    ├── marcombox.step-runner.ts
    ├── marcombox.test-data.ts
    └── marcombox.yopmail.ts

tests/
├── marcombox-smoke/                    # Fast, critical-path checks
│   ├── marcombox.api-health.spec.ts
│   └── marcombox.login.spec.ts
└── marcombox-journeys/                 # End-to-end business flows
    ├── marcombox.local-upload.spec.ts
    └── marcombox.guest-upload.spec.ts

test-data/marcombox/                    # Sample files for uploads
marcombox.global-setup.ts               # Logs in once, saves session
docs/TEST_STRATEGY.md                   # Scope, tags, risks
```

## Where to Change What

| Task                     | File to edit                                            |
| ------------------------ | ------------------------------------------------------- |
| Add a new UI action      | `marcombox-dam/pages/marcombox-*.page.ts`               |
| Change login / env setup | `marcombox-dam/config/marcombox.environment.ts`         |
| Add a new test           | `tests/marcombox-smoke/` or `tests/marcombox-journeys/` |
| Email / Yopmail logic    | `marcombox-dam/support/marcombox.email.ts`              |
| Safe asset cleanup rules | `marcombox-dam/support/marcombox.asset-prefixes.ts`     |

Import project code using the `@marcombox/` alias:

```typescript
import { test, expect } from '@marcombox/fixtures/marcombox.fixture';
import { MarcomboxAssetsPage } from '@marcombox/pages/marcombox-assets.page';
```

## Test Journeys

### Local upload (`marcombox.local-upload.spec.ts`) — `@smoke @regression`

Sign in → upload `.mp4` → fill metadata → edit → search → download → share via email → delete → logout.

### Guest upload (`marcombox.guest-upload.spec.ts`) — `@regression`

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

GitHub Actions runs on every push/PR to `main`. Configure repository secrets: `MARCOMBOX_EMAIL`, `MARCOMBOX_PASSWORD`, `MARCOMBOX_BASE_URL`, `USER_FOLDER_NAME`, `TEST_EMAIL`.

## Assumptions

- Your user folder must exist in DAM > Assets before running journeys
- Yopmail inbox must be accessible for email steps
- Video processing may take up to 3 minutes on slow networks
