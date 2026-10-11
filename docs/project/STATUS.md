# Project status

All dates use Europe/Berlin. Read this document at the start of the next task.

Latest deployment check, 2026-10-11: PROD webhook signatures accepted; SANDBOX, wrong and missing signatures rejected. Magic-link login and seven portal pages passed. Logout cookie regression remains present; full provider/website integration acceptance remains open. Details are in the final section.

## 2026-10-11 — Initialization completed; integration remains open

Scope: manage `TylonHH/openpartner`, verify the affiliate flow, create focused origin PRs, and integrate Stripe with HörGeschenk. Program administration follows later.

### Checkout and branch inventory

- Initialized `F:\_CODEX\_OpenPartner` around the existing private `.env`. Base `origin/main`: `1b7354d3921d7314e0dd054526fd1b1851a0a607`. Working branch: `codex/project-initialization`; comparison remote: `getcoherence/openpartner`.
- Inventoried 13 original origin branches. No historical branch was deleted or merged. Ancestry counts and dispositions are in `OVERVIEW.md`.
- Existing [PR #7](https://github.com/TylonHH/openpartner/pull/7) is 3 commits ahead and 12 behind the initial main. Its old audit failure predates main's dependency fixes. Storage, domains and optional RLS configuration belong in that separate review.
- Created root `AGENTS.md`, architecture/integration overview, acceptance matrix, isolated validation runner, and skills for validation and AgentMail magic login. Initialization review: [PR #15](https://github.com/TylonHH/openpartner/pull/15).
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
- Stopped the owned local database after verification; restart it for the next validation run. Root checkout is committed; private environments and worktrees remain ignored.

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
5. Complete `TEST-MATRIX.md` using the sandbox key and the provided sandbox signing-secret alias described below. Website signing secret is separate.
6. Review/merge and deploy only under a concrete rollout instruction.

No claim of full live end-to-end functionality or payout readiness is made. No production payment, transfer, refund or affiliate program policy change was triggered.

## 2026-10-11 — Stripe secrets and subscription follow-up

The user added `checkout.session.completed` to PROD and SANDBOX destinations and stored `STRIPE_WHEC_PROD` / `STRIPE_WHEC_SANDBOX` in private root `.env`. The production-hosted application still uses the sandbox endpoint secret. Stripe CLI is installed and logged in for sandbox work.

- Verified both provided values have signing-secret format and differ, without exposing them. These names are local aliases; runtime code reads `STRIPE_WEBHOOK_SECRET_PLATFORM`, `STRIPE_WEBHOOK_SECRET_CONNECT`, or the legacy `STRIPE_WEBHOOK_SECRET`.
- Re-read the existing OpenPartner sandbox endpoint through Stripe's API: enabled and now includes `checkout.session.completed`. The user subsequently added `STRIPE_SECRET_KEY_PROD` alongside `STRIPE_SECRET_KEY_SAND` in `.env.integration.local`. Read-only balance/endpoint checks authenticate both keys with `livemode=true` / `false` respectively. PROD destination is independently verified enabled with `checkout.session.completed`; both modes target the same hosted URL. Sandbox and LIVE keys belong to different Stripe accounts; CLI matches the sandbox account.
- Sent two signed synthetic Checkout probes to the hosted API. Each omitted tenant metadata, customer and click reference so tenant resolution exits before database writes or Stripe customer operations. Sandbox-secret probe: HTTP 200 with `unresolved_tenant`. PROD-secret probe: HTTP 400 `invalid_signature`. This verifies signature configuration, not provider delivery or a conversion.
- The hosted API currently rejects PROD-secret signatures. Real live deliveries cannot be credited while it remains configured this way. The application source has no automatic `livemode` isolation check; environment separation depends on deployed credentials/destinations and separate test data.
- CLI version 1.53.1; `stripe whoami --format json` confirms test mode and the same account as the sandbox API key. Retrieved the CLI listener secret privately with `stripe listen --print-secret --skip-update`; it differs from both Dashboard secrets. Removed the private intermediate file. No forwarding listener remains active and no `stripe trigger` command ran.
- Created `.agents/skills/openpartner-stripe-webhooks/SKILL.md` for this recurring check, including exact alias mapping, signature-only probe boundaries and CLI/Dashboard distinction. Secrets and CapRover configuration remain unchanged by the agent.

For live rollout, the API must use the live Stripe API key in `STRIPE_SECRET_KEY` and the PROD destination secret in `STRIPE_WEBHOOK_SECRET_PLATFORM`. For sandbox integration, use the sandbox API key and SANDBOX destination secret on the test application. A CLI-forwarded local receiver uses its own listener secret. Do not enable both live and sandbox financial writes against one ledger as an incidental test workaround.

Remaining acceptance: isolated referral/customer stitching, genuine signed provider delivery, one-time revenue, retry deduplication, refund behavior and website integration. The initial missing-signing-secret and missing-Checkout-subscription blockers are now resolved for sandbox signature tests.

## 2026-10-11 — Production deployment verification

The user reports a newly deployed image and production configuration. The agent performed post-deployment checks without changing CapRover, Stripe resources or program policy:

- Portal and API health return HTTP 200. Admin environment-bearer whoami returns 200, admin/source env.
- Safe synthetic Checkout probe signed with `STRIPE_WHEC_PROD`: HTTP 200, skipped with `unresolved_tenant`. Same unmapped probe signed with `STRIPE_WHEC_SANDBOX`: 400 `invalid_signature`. Deliberately wrong secret: 400 `invalid_signature`; omitted signature: 400 `missing_signature`. These requests contain no tenant, customer or click reference and perform no conversion/financial write.
- This reverses the earlier signature-configuration failure: the hosted API now accepts the provided PROD secret and rejects the provided SANDBOX secret. It verifies signing configuration, not actual Stripe delivery or the runtime API key's account/mode. The user reports production credentials; the local LIVE key was independently verified earlier.
- Reused the existing AgentMail inbox/admin and requested one signin link. Mail arrived; fresh Chromium context completed magic login with 200 whoami, admin/source session and matching named admin.
- All seven portal routes render with expected headings and no page exceptions. The root admin heading is `Partner Program` (the navigation label is Dashboard). Program read returns 200 and one program.
- UI signout returns to login; whoami becomes 401; consumed-token verification returns 400 `invalid_or_expired_token`. The empty `op_session` cookie still expires about 30 days in the future. Existing PR #13's cookie fix is not effective in this deployment. Test browser/context closed and session revoked.
- Refetched origin: main remains `1b7354d3921d7314e0dd054526fd1b1851a0a607`; PRs #12–#15 remain open. No deployed image digest/commit was exposed by the checks, so do not infer that the bug PRs are included merely from the new deployment.
- Updated the webhook and magic-login skills with negative-signature checks, the exact root heading and cookie-expiry verification. No unchanged local financial suite was rerun for this configuration check.

Next acceptance remains isolated sandbox provider/website integration, including identity, paid revenue, retries and refunds. Signature-only probes are not evidence of a completed payment or commission. No live purchase, refund, transfer or payout was triggered.
