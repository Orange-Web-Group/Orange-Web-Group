# TrueDraft

An AI writing detector built by Orange Web Group. Paste text or upload a file and TrueDraft returns a Human / Mixed / AI verdict, a probability breakdown, and sentence-level highlighting.

## Features

- **Two detection engines**
  - *Standard* (always on, free to run): statistical signals such as burstiness (sentence length variation), stock AI phrasing, formal transitions, rule-of-three lists, contractions and first-person voice. Lives in `src/lib/detector/stats.ts`.
  - *Deep Scan* (Pro and Team): Claude reviews every sentence. Its scores are blended 70/30 with the statistical engine. Lives in `src/lib/detector/claude.ts`. If it is unavailable, the scan falls back to Standard and tells the user.
- Sentence highlighting, confidence levels, and a plain-English explanation of each verdict
- File upload for `.txt`, `.md`, `.docx` and `.pdf` (Starter and above)
- Downloadable HTML reports, plus recent scan history kept in the user's browser
- Four plans with monthly and annual billing through Stripe Checkout (`src/lib/plans.ts`)
- Per-scan and monthly word limits, tracked in an HMAC-signed cookie
- Public REST API at `POST /api/v1/detect` (see `/developers`)
- Pages: detector (home), pricing, API docs, and a methodology / accuracy page

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

The app runs with no keys at all: the standard engine, the limits and the whole UI work out of the box.

| Variable | Purpose |
| --- | --- |
| `APP_SECRET` | **Required in production.** Signs the plan/usage cookie. |
| `ANTHROPIC_API_KEY` | Turns on Deep Scan. |
| `DEFAULT_PLAN` | Plan for visitors without a paid cookie. Set to `pro` locally to demo paid features. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*` | Turns on checkout. Create a recurring price in Stripe for each plan and interval. |
| `APP_URL` | Public base URL, used for Stripe redirects. |
| `API_KEYS` | Comma-separated keys accepted by `/api/v1/detect`. |

## Scripts

- `npm run dev`: start the development server
- `npm run build && npm start`: production build and server
- `npm test`: run the detector, verdict and cookie-signing tests
- `npm run typecheck`: run the TypeScript checks

## Before a public launch

This MVP has no user accounts, so it does not need a database. That keeps it simple, but it has limits you should address before you scale:

1. **Accounts and a database.** Plan and usage live in a signed cookie. Clearing cookies resets free usage, and a paid plan is tied to one browser. Add auth (for example Clerk or Auth.js) and store plans and usage in Postgres.
2. **Stripe webhooks.** Paid plans are currently granted on a verified checkout redirect. Add a `customer.subscription.*` webhook so cancellations and failed payments downgrade the account.
3. **Rate limiting** on `/api/detect` and `/api/v1/detect` (for example Upstash), and per-key usage metering for the API.
4. **Calibration.** The statistical weights are hand-tuned. Before you make accuracy claims in marketing, collect a labelled set of human and AI text from your target audience and measure false-positive rates.
5. **Brand check.** "TrueDraft" is a working name. Run a trademark and domain search before launch.
