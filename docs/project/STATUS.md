# Project status

All dates use Europe/Berlin. Read this document at the start of the next task.

## 2026-10-11 — Initialization completed; integration remains open

Scope: manage `TylonHH/openpartner`, verify the affiliate flow, create focused origin PRs, and integrate Stripe with HörGeschenk. Program administration follows later.

### Checkout and branch inventory

- Initialized `F:\_CODEX\_OpenPartner` around the existing private `.env`. Base `origin/main`: `1b7354d3921d7314e0dd054526fd1b1851a0a607`. Working branch: `codex/project-initialization`; comparison remote: `getcoherence/openpartner`.
- Inventoried 13 original origin branches. No historical branch was deleted or merged. Ancestry counts and dispositions are in `OVERVIEW.md`.
- Existing [PR #7](https://github.com/TylonHH/openpartner/pull/7) is 3 commits ahead and 12 behind the initial main. Its old audit failure predates main's dependency fixes. Storage, domains and optional RLS configuration belong in that separate review.
- Created root `AGENTS.md`, architecture/integration overview, acceptance matrix, isolated validation runner, and skills for validation and AgentMail magic login.
- Related `F:\_CODEX\_AudioBook\TEST_website` has extensive unpublished work and a stale local main. Preserved all edits. Fetched website origin main: `9d9da2583ef2fa9d1d78f025bebbdd8bd41e96ce`; no OpenPartner wiring found in current server/client/docs/environment example. Use an isolated worktree for integration.

### Verification and origin PRs

Local reference: Node 22.20.0, pnpm 9.15.4, PostgreSQL 16.15. Host Node is 26.10.0; CI uses Node 22 and pnpm 9.11.0. Docker 29.8.0 and RTK 0.48.0 are available.

- Frozen dependency installation, shared DB build, migrations, lint and typecheck passed. Five existing lint warnings remain.
- Corrected main baseline: **546 tests passed in 53 files** (API 520, SDK 11, router 3, portal 12). That initial fixture lacked the app role, so its RLS assertion coverage was not counted.
- Fresh owned fixture now provisions `openpartner_app` with a distinct local password, LOGIN, no SUPERUSER and no BYPASSRLS. The combined validation preview runs all three fixes: **554 tests passed in 54 files** (API 528/49 files, SDK 11/2, router 3/1, portal 12/2), including all nine multi-tenant suite cases with the app role present and no missing-role warning. No Vitest skips reported; DB package has no tests.
- Combined preview at local commit `2d470ed`: every workspace production build passed, including SDK ESM/CommonJS and declarations. Preview is a local worktree/branch, not a deployment.
- Production dependency audit: 19 advisories, 2 low and 17 moderate; zero high/critical. Passed the configured high threshold.
- [PR #12](https://github.com/TylonHH/openpartner/pull/12), commit `3c3b178`: blank/whitespace optional `DATABASE_URL_APP` falls back to the primary URL. Five connection-factory tests; two reproduced failures before the fix.
- [PR #13](https://github.com/TylonHH/openpartner/pull/13), commit `463d257`: expire cookies on tenant/platform/operator logout and identity changes. Shared helper preserves scope/security attributes but removes lifetime options. Regression failed before the fix; actual route regressions and invitation suites pass.
- [PR #14](https://github.com/TylonHH/openpartner/pull/14), commit `82a71fa`: fix SDK TypeScript 6 declaration generation and add full builds to CI. TypeScript 7 will require tsup to stop injecting deprecated `baseUrl`.
- All four GitHub checks on each of PRs #12, #13 and #14 passed: typecheck/test and API/router/portal Docker builds. PR #14's CI also verifies all workspace builds. No merge or production rollout performed.
- Private reproduction logs: `.cache/validation/preview-test.log` and `preview-build.log`. They contain dummy fixture identities/tokens and stay ignored.

Earlier failures remain recorded: Node 26's native storage shadows jsdom in SDK tests; Node 22 resolves the environment mismatch. A blank app URL made pg use localhost:5432; the application fix is PR #12. One corrected baseline run had 544 passes and two funding-sweep per-run limit/advance failures; all 62 tests in that file then passed, followed by the 546-test main run and 554-test combined run. The intermittent funding cause is unresolved; no speculative financial fix was applied.

### Live authentication and deployment reads

- Verified portal `https://affiliate.warsowerk.de` and API `https://affiliate-api.warsowerk.de/health`: 200. Router `https://go.warsowerk.de/`: 404; root alone does not test referral routing. Old affiliate hosts under `hoerbuch.warsowerk.de` failed to connect.
- Production bearer whoami: admin/source env. One existing active admin and one program before login testing.
- User authorized own AgentMail inbox. Created/reuse `embarrassedorder41@agentmail.to`, client ID `openpartner-codex`, named admin `Codex OpenPartner (AgentMail)`. Invitation delivered from HörGeschenk. This account remains available for project management.
- First invitation browser attempt returned `invalid_or_expired_token` despite admin activation; exact cause unresolved. A separately requested regular signin link passed in clean Chromium: admin/source session and the expected named admin.
- Bearer/session reads agree on the one program. Dashboard, Programs, Partners, Links, Commissions, Payouts and Settings render without page exceptions. Identity switcher's expected missing-platform-session 401 is handled.
- Reused token rejected with 400; UI signout redirects to login and whoami becomes 401. Live blank `op_session` still had a 30-day lifetime; local Express reproduction confirmed the cookie issue fixed in PR #13. This fix is not yet deployed. Browser session closed after signout.
- Named session and environment bearer intentionally differ in identity-dependent features; primary portal login remains magic link.

### Optional RLS and Stripe sandbox

User clarification and original upstream confirm: `DATABASE_URL_APP` is optional RLS hardening. `DATABASE_URL` and the app URL target the same database using different roles/passwords. `OPENPARTNER_APP_DB_PASSWORD` provisions the app-role password. `OPENPARTNER_OUTBOUND_ALLOWED_PORTS=80,443` is separate outbound hardening. PR #12 retains every nonempty app URL; no production credential/configuration changes made.

User supplied `STRIPE_SECRET_KEY_SAND` in ignored `.env.integration.local`. Confirmed test-key format and successful Stripe balance read with `livemode=false`. Read existing webhook destinations; no Stripe resource was created or modified:

- OpenPartner test destination `https://affiliate-api.warsowerk.de/webhooks/stripe` is enabled, but **does not subscribe to `checkout.session.completed`**. Current source relies on that event for Checkout click/customer stitching. Review and correct subscriptions as part of integration; do not claim Checkout attribution works now.
- Website test destination `https://audiobook-dev.caprover.drrene.de/api/stripe/webhook/hoergeschenk` includes Checkout and invoice/subscription events.
- Existing n8n test destination also receives Checkout completion. Preserve invoice workflow.
- No `STRIPE_WEBHOOK_SECRET_PLATFORM` is present in the local integration file. API authentication is verified; signed delivery and end-to-end financial behavior remain unverified.

### Next work and missing input

1. Reproduce the first invitation anomaly and investigate funding flakiness if it recurs.
2. Verify deployed API/router/portal commits or image digests; health does not expose revision.
3. Review PR #7 against current main and reconcile CapRover storage/domains/configuration separately.
4. In an isolated website worktree, choose one existing attribution mechanism. Preserve customer `?ref` credits, consent, user/customer identity, n8n invoices and existing checkout. Verify one-time revenue and durable retry deduplication.
5. Complete `TEST-MATRIX.md` using the sandbox key. Add the OpenPartner endpoint-specific test signing secret to the private integration file when signed provider delivery is needed. Website signing secret is separate.
6. Review/merge and deploy only under a concrete rollout instruction.

No claim of full live end-to-end functionality or payout readiness is made. No production payment, transfer, refund or affiliate program policy change was triggered.
