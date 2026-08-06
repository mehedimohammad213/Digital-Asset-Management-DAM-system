# Digital-Asset-Management-DAM-system

Playwright + TypeScript automation for the MarcomBox QA DAM application, covering two independent asset lifecycle scenarios that run in parallel with two workers.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Edit `.env` with your credentials (never commit `.env`):

| Variable | Description |
|----------|-------------|
| `MARCOMBOX_EMAIL` | Login email |
| `MARCOMBOX_PASSWORD` | Login password |
| `MARCOMBOX_BASE_URL` | App URL (default: `https://qatest.marcombox.com`) |
| `USER_FOLDER_NAME` | Your folder in DAM > Assets (e.g. `mehedi`) |
| `TEST_EMAIL` | Inbox for share/guest-upload emails (Yopmail works) |

## Running Tests

```bash
# Both scenarios in parallel (2 workers)
npm test

# Individual scenarios
npm run test:scenario1
npm run test:scenario2

# Headed mode for debugging
npm run test:headed

# HTML report
npm run report
```

## Project Structure

```
├── src/
│   ├── helpers/
│   │   ├── dateTime.ts      # Date/time formatting for metadata
│   │   ├── testData.ts      # Unique test IDs per scenario
│   │   ├── yopmail.ts       # Yopmail inbox helper for email verification
│   │   └── cleanup.ts       # Safe cleanup utilities
│   └── pages/               # Page Object Model
│       ├── LoginPage.ts
│       ├── AssetsPage.ts
│       ├── AssetDetailPage.ts
│       └── GuestUploadPage.ts
├── tests/
│   ├── scenario1-local-upload.spec.ts   # MP4 upload lifecycle
│   └── scenario2-folder-upload.spec.ts  # JPG guest upload
├── test-data/
│   ├── sample.mp4
│   └── sample.jpg
└── playwright.config.ts     # 2 workers, HTML + JUnit reports
```

## Scenarios

### Scenario 1: Local Upload and Text Search (`.mp4`)

1. Sign in → DAM > Assets → user folder
2. New Item → upload unique-named MP4 (drag-and-drop capable)
3. Fill metadata (title, type, date, description, tags, automated flag, hyperlink)
4. Save and verify asset
5. Edit title, date, description
6. Search, download, share via email, verify inbox
7. Delete asset and logout

### Scenario 2: Folder Upload and Filter (`.jpg`)

1. Sign in → DAM > Assets
2. Enable edit mode → right-click folder → Guest upload/share
3. Send invite to test email
4. Open link from inbox → enter OTP from second email
5. Upload JPG via Browse Files
6. Verify upload in DAM folder and cleanup

## Design Decisions

- **Playwright** chosen for built-in parallel workers, trace/video on failure, and strong auto-waiting
- **Page Object Model** separates UI selectors from test logic
- **Unique filenames** per run avoid duplicate-name upload errors
- **Yopmail browser client** reads share/OTP emails without external API keys
- **Independent scenarios** use distinct test ID prefixes (`S1-VIDEO`, `S2-IMAGE`) and separate spec files

## Reports

On failure, artifacts are saved under `test-results/`:

- Screenshots
- Video recordings
- Playwright traces (`npx playwright show-trace <trace.zip>`)

HTML report: `playwright-report/`  
JUnit XML: `test-results/junit.xml`

## Assumptions & Limitations

- User folder (`mehedi`) must exist in DAM > Assets before running tests
- Yopmail inbox (`mehedi.mbxqa@yopmail.com`) must be accessible for email steps
- Video processing may take up to 3 minutes on slow networks
- Search indexes title/filename; unique test identity is verified in asset detail after search by title
- Do not delete unrelated assets (e.g. shared folders like `mushfiqur`)

## Possible Improvements

- CI pipeline with GitHub Actions and secrets
- API-based Yopmail reader for faster email polling
- Retry wrapper for flaky network operations
- Visual regression on asset thumbnails
- Data-driven metadata validation matrix

## Credentials

Use the account assigned for QA. Store credentials in `.env` only — **never commit passwords**.
