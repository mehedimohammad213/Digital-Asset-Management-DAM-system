# Test Strategy — MarcomBox DAM Automation

## Scope

| Layer              | Coverage                                   | Tools                          |
| ------------------ | ------------------------------------------ | ------------------------------ |
| **API smoke**      | App reachability, login page availability  | Playwright `request` fixture   |
| **Auth**           | Valid login, invalid password (negative)   | UI — unauthenticated project   |
| **E2E regression** | Asset upload lifecycle, guest upload + OTP | Playwright + Page Object Model |

Out of scope: performance testing, visual regression, mobile viewports, production environment.

## Test Tags

| Tag           | Purpose                            | Run command                        |
| ------------- | ---------------------------------- | ---------------------------------- |
| `@smoke`      | Fast critical-path checks (~2 min): auth + API health | `npm run test:smoke`               |
| `@regression` | Full business scenarios (upload lifecycle, guest upload) | `npm run test:regression`          |
| `@auth`       | Login / logout flows               | `playwright test --grep @auth`     |
| `@api`        | HTTP-level checks (no browser UI)  | `playwright test --grep @api`      |
| `@negative`   | Expected failure paths             | `playwright test --grep @negative` |

## Architecture

```
global-setup.ts          → saves authenticated session to .auth/user.json
src/fixtures/            → shared page objects + env config injected into tests
src/pages/               → Page Object Model (selectors isolated from specs)
src/helpers/             → email polling, cleanup, test data factories
tests/auth/              → unauthenticated project (fresh browser context)
tests/api/               → API smoke (uses authenticated base URL only)
tests/scenario*.spec.ts  → regression flows (reuse saved auth session)
```

## Environment Assumptions

- Target: `https://qatest.marcombox.com` (QA)
- Dedicated user folder exists (`USER_FOLDER_NAME`)
- Yopmail inbox accessible for share/OTP emails
- Video processing may take up to 3 minutes

## Data Management

- Each run generates unique asset names (`S1-VIDEO-*`, `S2-IMAGE-*`, `automation-*`)
- Teardown deletes **only** assets matching automation prefixes — manual assets are never touched
- Temporary upload files are removed in `finally` blocks

## CI Pipeline

1. **Validate** — TypeScript compile, ESLint, Prettier
2. **Playwright** — Docker container, 2 workers, 2 retries on failure
3. **Artifacts** — HTML report, JUnit XML, traces/screenshots/videos (14-day retention)

## Risk Register

| Risk                         | Mitigation                                                             |
| ---------------------------- | ---------------------------------------------------------------------- |
| Flaky email delivery         | API polling with browser fallback; 120s timeout                        |
| Slow video upload/processing | 180s save timeout; explicit expect waits                               |
| Shared QA folder pollution   | Prefix-based cleanup, not bulk delete                                  |
| Brittle UI selectors         | Role-based locators preferred; label-based field lookup with fallbacks |

## Future Improvements

- Cross-browser matrix (Firefox, WebKit)
- Visual regression on asset thumbnails
- Test management integration (Xray / Allure)
- API-level asset setup/teardown if backend endpoints become available
