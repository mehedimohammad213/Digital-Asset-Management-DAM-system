# Digital-Asset-Management-DAM-system

Production-grade Playwright + TypeScript automation for the MarcomBox QA DAM application. Covers API smoke checks, authentication, and two independent asset lifecycle scenarios that run in parallel.

See [TEST_STRATEGY.md](./TEST_STRATEGY.md) for scope, tags, architecture, and risk register.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Edit `.env` with your credentials (never commit `.env`):

| Variable             | Description                                         |
| -------------------- | --------------------------------------------------- |
| `MARCOMBOX_EMAIL`    | Login email                                         |
| `MARCOMBOX_PASSWORD` | Login password                                      |
| `MARCOMBOX_BASE_URL` | App URL (default: `https://qatest.marcombox.com`)   |
| `USER_FOLDER_NAME`   | Your folder in DAM > Assets (e.g. `mehedi`)         |
| `TEST_EMAIL`         | Inbox for share/guest-upload emails (Yopmail works) |

## Running Tests

```bash
# Full suite (global auth setup + all projects)
npm test

# Smoke subset (~5 min)
npm run test:smoke

# Regression scenarios only
npm run test:regression

# Individual scenarios
npm run test:scenario1
npm run test:scenario2

# Headed mode for debugging
npm run test:headed

# HTML report
npm run report
```

## Code Quality

```bash
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint (TypeScript + Playwright rules)
npm run format:check   # Prettier
npm run validate       # All of the above
```

## Docker

Run the full test suite in a container (uses the official Playwright image with Chromium pre-installed):

```bash
cp .env.example .env   # configure credentials first
npm run docker:build
npm run docker:test
```

Or with Docker Compose directly:

```bash
docker compose build test
docker compose run --rm test
```

Reports and artifacts are written to `test-results/` and `playwright-report/` on the host via volume mounts.

## CI/CD

GitHub Actions runs lint, typecheck, and Playwright tests on every push and pull request to `main`.

### Required repository secrets

Configure these under **Settings → Secrets and variables → Actions**:

| Secret               | Description                         |
| -------------------- | ----------------------------------- |
| `MARCOMBOX_EMAIL`    | Login email                         |
| `MARCOMBOX_PASSWORD` | Login password                      |
| `MARCOMBOX_BASE_URL` | App URL (optional; defaults to QA)  |
| `USER_FOLDER_NAME`   | DAM folder name                     |
| `TEST_EMAIL`         | Inbox for share/guest-upload emails |

After every CI run, download the **playwright-report** artifact from the workflow run summary.

## Project Structure

```
├── global-setup.ts              # Authenticates once; saves session to .auth/
├── src/
│   ├── config/env.ts            # Validated environment variables
│   ├── fixtures/test.fixture.ts # Shared Playwright fixtures (POM + env)
│   ├── helpers/
│   │   ├── constants.ts         # Automation asset prefixes (safe cleanup)
│   │   ├── cleanup.ts           # Prefix-based teardown
│   │   ├── dateTime.ts          # Date/time formatting
│   │   ├── email.ts             # API + browser email fallback
│   │   ├── testData.ts          # Unique test IDs per scenario
│   │   └── yopmail.ts           # Yopmail inbox helper
│   └── pages/                   # Page Object Model
│       ├── LoginPage.ts
│       ├── AssetsPage.ts
│       ├── AssetDetailPage.ts
│       └── GuestUploadPage.ts
├── tests/
│   ├── api/health.spec.ts       # @smoke @api
│   ├── auth/login.spec.ts       # @smoke @auth @negative
│   ├── scenario1-local-upload.spec.ts   # @smoke @regression
│   └── scenario2-folder-upload.spec.ts  # @regression
├── test-data/
│   ├── sample.mp4
│   └── sample.jpg
├── TEST_STRATEGY.md
└── playwright.config.ts         # 2 projects, HTML + JUnit reports
```

## Scenarios

### Scenario 1: Local Upload and Text Search (`.mp4`) — `@smoke @regression`

1. Sign in → DAM > Assets → open your user folder
2. New Item → upload local `.mp4`
3. Create asset with title, type Video, date/time, description (unique test identity), tags, automated testdata flag, and hyperlink
4. Save and wait for upload/processing
5. Open asset → verify file name and all metadata values
6. Edit title, date/time, and description → Save
7. Confirm changes saved, Type unchanged, copy item ID
8. Close detail panel → top text search by unique identity → confirm identity and item ID
9. Hover thumbnail → ellipsis → Download → confirm file downloaded
10. Share → enter test email → Send
11. Confirm new share email in inbox (timestamp-filtered, not old/Scenario 2 mail)
12. Delete created asset → confirm gone → logout

### Scenario 2: Folder Upload and Filter (`.jpg`) — `@regression`

1. Enable edit mode → guest upload invite
2. Open link from inbox → OTP verification
3. Upload JPG via guest portal
4. Verify in DAM folder and cleanup

## Design Decisions

- **Playwright fixtures** inject page objects and validated env config into every test
- **Global setup + storageState** avoids repeated login in regression flows
- **Page Object Model** keeps selectors out of test specs
- **Prefix-based cleanup** never deletes manual/non-automation assets
- **API-first email polling** with browser fallback for reliability
- **Test tags** (`@smoke`, `@regression`, `@auth`, `@api`, `@negative`) enable selective runs
- **ESLint + Prettier + TypeScript strict** enforce code quality in CI

## Reports

On failure, artifacts are saved under `test-results/`:

- Screenshots
- Video recordings
- Playwright traces (`npx playwright show-trace <trace.zip>`)

HTML report: `playwright-report/`  
JUnit XML: `test-results/junit.xml`

## Assumptions & Limitations

- User folder must exist in DAM > Assets before running tests
- Yopmail inbox must be accessible for email steps
- Video processing may take up to 3 minutes on slow networks
- Chromium only (cross-browser planned — see TEST_STRATEGY.md)

## Credentials

Use the account assigned for QA. Store credentials in `.env` only — **never commit passwords**.
