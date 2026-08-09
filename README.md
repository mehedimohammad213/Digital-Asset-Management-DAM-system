# DAM Automation

Playwright + Cucumber (BDD) + Allure test suite for the **Digital Asset Management (DAM)** QA environment.

## Quick Start

```bash
npm install
npx playwright install chromium
cp .env.example .env   # add your credentials
npm test
npm run report         # open Allure report after a run
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
npm run report              # Generate and open Allure report
```

## Project Structure

```
features/                     # Gherkin feature files
├── smoke/
└── journeys/
steps/                        # Cucumber step definitions
src/
├── config/environment.ts       # Reads .env credentials
├── fixtures/bdd.fixture.ts     # Playwright + BDD fixtures
├── pages/                      # Page Object Model
└── support/                    # Shared helpers
test-data/                      # Sample files for uploads
.features-gen/                  # Generated Playwright tests (bddgen)
global-setup.ts                 # Logs in once, saves session
docs/TEST_STRATEGY.md
```

## Where to Change What

| Task                     | File to edit                    |
| ------------------------ | ------------------------------- |
| Add a new UI action      | `src/pages/*.page.ts`           |
| Change login / env setup | `src/config/environment.ts`     |
| Add a new scenario       | `features/` + `steps/`          |
| Email / Yopmail logic    | `src/support/email.ts`          |
| Safe asset cleanup rules | `src/support/asset-prefixes.ts` |
| Change DAM user folder   | `src/support/test-data.ts`      |

Import project code using the `@src/` alias:

```typescript
import { Given, When, Then, expect } from '@src/fixtures/bdd.fixture';
import { AssetsPage } from '@src/pages/assets.page';
```

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
