# OpenPartner project overview

## Goal and system boundaries

The project manages the [TylonHH OpenPartner fork](https://github.com/TylonHH/openpartner) and its integration with [HörGeschenk](https://github.com/TylonHH/TEST_website). HörGeschenk owns accounts, checkout, orders, consumer invoices and audiobook credits. Stripe owns payment/refund status. OpenPartner owns affiliate links, partner identities, attribution and the commission ledger. Existing customer referral credits and n8n invoice delivery must continue to work. PostHog remains product analytics, not the source of commission accounting.

The current checkout starts from origin main at `1b7354d`. Existing upstream documentation is useful, but some runtime/version/deployment details are stale. Prefer package manifests, source code, migrations and verified deployed behavior over prose assumptions.

## Application map

| Component | Responsibility | Main entry points |
| --- | --- | --- |
| `apps/router` | Affiliate redirect, click recording, `_cref` cookie and velocity guard | `src/server.ts`, `src/velocity.ts` |
| `apps/api` | Authentication, events, identity, attribution, commissions, program administration, Stripe and payout logic | `src/app.ts`, `src/auth.ts`, `src/routes/stripe-webhook.ts` |
| `apps/portal` | React/Vite admin and partner portal; nginx `/api` proxy in deployment | `src/App.tsx`, `src/api.ts`, `vite.config.ts` |
| `packages/db` | PostgreSQL schema, Knex migrations, types and tenant isolation | `migrations/`, `src/`, `scripts/migrate.ts` |
| `packages/sdk` | Browser referral capture/identify and server event ingestion | `src/browser.ts`, `src/server.ts` |
| `caprover` | Self-host deployment preset | `one-click.yml`, `README.md` |

Core data flow is clicks, identities, events, derived attributions, commissions and payouts. Default self-host mode avoids hosted billing. Preserve immutable raw data and audit history.

## Authentication findings

Primary sign-in is `POST /auth/signin`, email magic link, then `POST /auth/magic/verify`, which issues `op_session`. The portal verifies through `/api/auth/magic/verify`. Named admin sessions resolve to `source=session` and carry `adminId`.

`ADMIN_API_KEY` yields `role=admin, source=env`. It is suitable for automation/bootstrap/recovery, but has no personal admin record. Observed intentional differences:

- `/auth/whoami` includes a named admin only for a session.
- Mail-test recipient can default to the signed-in admin's email; bearer callers must supply the recipient.
- Network auto-enrollment requires a named session; bearer callers use the contact-email connection flow.
- Self-revocation protection identifies a session admin; the emergency bearer remains a recovery path. Last-active-admin protection still applies.
- Portal `op:apiKey` localStorage supplies an Authorization header when present; that header takes precedence over a session cookie. Use a fresh context when testing magic links.

These differences do not establish a bug. Compare actual UI behavior and permission failures before changing them. A scoped integration key is deliberately rejected by portal whoami.

Live regular signin passes in Chromium and renders the expected named admin. Programs match bearer access. Dashboard, Programs, Partners, Links, Commissions, Payouts and Settings render. The first invitation attempt returned an invalid-token message despite activation; it needs a separate reproduction before assigning a cause.

Three confirmed findings have focused origin PRs, each with passing GitHub CI:

- `apps/api/src/db.ts` uses nullish fallback for `DATABASE_URL_APP`, so an optional empty value (as in `.env.example`) selects an empty connection and pg defaults to localhost:5432. Both fixture URLs are pinned while reproducing the application case separately.
- Logout passes creation cookie options, including `maxAge`, to Express `clearCookie`. The server revokes the session, but the browser receives a blank cookie with a new 30-day lifetime. Confirmed both in the live browser and in a local Express probe. Clear operations must preserve scope/security options while removing lifetime options across all session types.
- The SDK declaration build fails with TypeScript 6 because tsup supplies deprecated `baseUrl`. [PR #14](https://github.com/TylonHH/openpartner/pull/14) scopes the compatibility option to declaration generation and adds a full build to CI.

[PR #12](https://github.com/TylonHH/openpartner/pull/12) fixes only blank/whitespace app-URL fallback. [PR #13](https://github.com/TylonHH/openpartner/pull/13) clears session cookies across tenant, platform and operator routes. These PRs are reviewable; no production deployment or merge has been performed.

## Branch inventory, 2026-10-11

Counts are ancestry differences against `origin/main` (`1b7354d`), not proof a patch is missing. Squash/cherry-pick merges can leave equivalent patches on diverged branches. Inspect diff and patch equivalence before any cleanup.

| Origin branch | Behind main | Ahead of main | Initial disposition |
| --- | ---: | ---: | --- |
| `main` | 0 | 0 | Base for new work |
| `caprover-auto-secrets-resend` | 16 | 2 | Historical deployment work; review only |
| `caprover-deploy` | 17 | 7 | Historical deployment work; review only |
| `chore/caprover-env-cleanup` | 12 | 3 | Open PR #7; separate review |
| `chore/nonblocking-security-audit` | 11 | 0 | Ancestor of main; cleanup candidate only |
| `feature/resend-mail-preset` | 17 | 1 | Historical mail preset |
| `fix/caprover-upload-volume` | 14 | 1 | Storage work overlaps PR #7; review patch |
| `fix/single-tenant-magic-link` | 15 | 2 | Review patch equivalence |
| `fix/upload-corp` | 13 | 1 | Review patch equivalence |
| `fix/upload-route-static-shadow` | 14 | 1 | Review patch equivalence |
| `upstream-fix/single-tenant-magic-link` | 17 | 2 | Upstream-oriented work; preserve |
| `upstream-fix/upload-corp` | 17 | 1 | Upstream-oriented work; preserve |
| `upstream-security/dependency-audit-fixes` | 17 | 5 | Upstream-oriented security work; preserve |

PR #7 updates storage, RLS application-role configuration, outbound ports, Stripe environment and current domains. Its older CI audit failed; current main has since merged security and audit fixes. Do not treat that old result as failure of current runtime tests.

## Deployment findings

`DATABASE_URL_APP` is optional RLS hardening, as the user clarified and the fetched original `getcoherence/openpartner` source confirms. `DATABASE_URL` uses the privileged migration/operator role and its database password. When RLS is configured, `DATABASE_URL_APP` uses `openpartner_app` and that role's distinct password, provisioned through `OPENPARTNER_APP_DB_PASSWORD`. Both URLs target the same database, not two separate databases. `OPENPARTNER_OUTBOUND_ALLOWED_PORTS=80,443` is outbound request hardening, independent of database credentials.

Preserve this optional deployment model. A nonempty RLS URL must not be replaced by the privileged URL. PR #12 only makes empty/whitespace optional values behave like an omitted value. The original upstream has the same nullish-fallback bug. The validation fixture uses its own local privileged role for both URLs to match baseline CI and provisions a separate non-superuser app role for the suite's `SET LOCAL ROLE` isolation checks. That fixture setup is not a production credential recommendation.

`main`'s CapRover README still recommends `affiliate.hoerbuch.warsowerk.de`, `affiliate-api.hoerbuch.warsowerk.de` and `go.hoerbuch.warsowerk.de`. Live probes instead found `affiliate.warsowerk.de` and `affiliate-api.warsowerk.de` reachable; `go.warsowerk.de/` returns 404. PR #7 already documents the newer domain layout. Domain/volume/env reconciliation belongs in that review, not a competing initialization change.

Production health and authentication do not identify the deployed commit. Compare all three deployed image SHA/digests before relying on main's fixes. Storage persistence, permissions, API proxy, CORS and cookie domain each need explicit acceptance checks.

## HörGeschenk integration review

The original website checkout is dirty and must be preserved. Its previously published audience-landing worktree is at `64e2eacd`. Fetched website origin main is now `9d9da2583ef2fa9d1d78f025bebbdd8bd41e96ce`; the intervening commits update audiobook duration and SEO checks. A search of current origin's `server`, `client`, `docs` and `.env.example` finds no `openpartner`, `client_reference_id` or `openpartner_user_id`. Existing Stripe checkout/customer metadata (`userId`), invoice handoff and customer referral credits remain the integration starting points. Create an isolated worktree from current origin before edits.

OpenPartner already offers two mechanisms:

1. Browser/server `identify` and server-to-server `/attribution/events` using a scoped `events:write` key.
2. Stripe webhook stitching through a real Click ID passed as Checkout `client_reference_id`. It associates the Stripe customer, then backfills `openpartner_user_id` and `openpartner_tenant_id`. `invoice.paid` records revenue in major currency units.

Choose the existing flow after tracing website registration, checkout, invoice and refund paths. Avoid recording the same revenue through both mechanisms. Website account `userId` and Stripe `cus_...` are different identity namespaces; keep identification and revenue consistent.

Important open checks:

- A one-time Checkout payment may not emit `invoice.paid` unless invoice creation is configured. Current OpenPartner's checkout mapping returns a `signup` event, not paid revenue. Verify the website's actual payment mode before considering checkout revenue supported.
- `/attribution/events` currently generates a new event ID on each POST. Metadata alone is not an idempotency guarantee. Retried website forwarding needs durable deduplication or a tested API change.
- Full invoice refunds have a reversal path; partial refunds are recorded for manual review. Do not claim automatic proportional reversal.
- Stripe signatures need the raw body; website and OpenPartner endpoints each use their own signing secret. OpenPartner's platform webhook secret is not the website webhook secret.
- Capture referral only under the agreed consent behavior. Preserve existing `?ref` customer referral credits, Stripe receipts, n8n invoice delivery, free demos and multi-landing routing.

Track the complete integration acceptance cases in `TEST-MATRIX.md`. No affiliate rates, program changes or real payouts are selected during initialization.
