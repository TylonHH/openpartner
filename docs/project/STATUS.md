# Project status

All dates use Europe/Berlin. This document is the working handoff for the OpenPartner project.

## 2026-10-11 — Initialization in progress

Request: initialize and manage `TylonHH/openpartner` in `F:\_CODEX\_OpenPartner`, test the full application, create origin PRs for confirmed improvements/bugs, and prepare integration with Stripe and HörGeschenk. Maintain progress and reusable skills. Affiliate program administration follows later.

- Initialized the previously empty checkout around the existing private `.env`; fetched all origin branches. Base `origin/main`: `1b7354d3921d7314e0dd054526fd1b1851a0a607`.
- Current working branch: `codex/project-initialization`. Added upstream as a comparison remote. No historical branch was deleted or merged.
- Root `.env` contains `ADMIN_API_KEY`; user subsequently added `agentmail_api`. Values are private and remain ignored.
- Found 13 origin branches and one open PR, [#7](https://github.com/TylonHH/openpartner/pull/7). It is 3 commits ahead and 12 behind main. Its failed CI step is the dependency audit on its older base; current main CI and CapRover image publication pass.
- Local tools: Node `26.10.0`, pnpm `9.15.4`, Docker `29.8.0`, RTK `0.48.0`. CI uses Node 22 and pnpm 9.11.0. Local results must record that version difference.
- Dedicated test database: owned container `openpartner-codex-test-db`, PostgreSQL 16, loopback `127.0.0.1:55433`, database `openpartner_test`. Never use the production database for the truncating suites.
- Verified production portal `https://affiliate.warsowerk.de` (200) and API `https://affiliate-api.warsowerk.de/health` (200). `https://go.warsowerk.de/` responds 404, which alone does not test a referral link. Old `*.hoerbuch.warsowerk.de` affiliate hosts failed to connect.
- Private bearer `/auth/whoami`: 200, role admin, source env. `/admins`: one existing active admin before the test; `/programs`: one program.
- User authorized the project's own AgentMail mailbox. Created inbox `embarrassedorder41@agentmail.to`, client ID `openpartner-codex`, and named admin `Codex OpenPartner (AgentMail)` through the existing invitation API. Invitation delivered from HörGeschenk. The first invite browser attempt reported `invalid_or_expired_token` despite the admin becoming activated; the exact cause is not yet established. A separately requested normal signin link subsequently passed in a clean Chromium context: whoami 200, role admin, source session, expected named admin.
- Live session and bearer reads return the same one program. Dashboard, Programs, Partners, Links, Commissions, Payouts and Settings render without page exceptions. The identity switcher probes `/me/workspaces` and receives 401 for a missing platform session; source handles that as an empty workspace list, so this is not a failed admin permission check.
- A consumed magic link returns 400 `invalid_or_expired_token`. UI signout redirects to `/login`; whoami then returns 401. However, a blank `op_session` cookie remains. Reproduced locally with installed Express: `clearCookie` receives `maxAge=2592000` and sets an empty cookie expiring 30 days later. A focused fix and regression test are planned; the original authenticated session is revoked.
- Frozen installation, database migrations, lint and typecheck pass. Lint reports five pre-existing unused-variable warnings. Initial Node 26 SDK tests fail because native storage shadows jsdom; the Node 22 run passes SDK/router/portal tests. A first database run exposed `DATABASE_URL_APP=''` selecting pg's default localhost:5432; the runner now pins both URLs to the fixture and the corrected full baseline is running.
- The empty app URL issue also exists in application code and is triggered by `.env.example`'s optional blank variable. Before the fix: reproduce URL selection with a mocked connection factory, then make a focused origin PR. Do not change the migration/database-role architecture.
- Production dependency audit: 19 advisories (2 low, 17 moderate), zero high/critical; command exits successfully at the configured high threshold. These findings remain tracked rather than described as an entirely clean audit.
- Corrected Node 22 baseline initially reported 544 passing tests and two funding-sweep failures (`funding-races.test.ts`, per-run limit/advance checks). All 62 tests in that file then passed in a targeted rerun. The full baseline is being repeated to establish whether the result depends on suite/database state; do not silently classify the first two failures as passed.
- Related checkout `F:\_CODEX\_AudioBook\TEST_website` contains extensive unpublished changes and a stale local main. Preserve it. Fetched website origin main is `9d9da2583ef2fa9d1d78f025bebbdd8bd41e96ce`. Current server/client/docs/environment example contain no OpenPartner wiring.

## Next work

1. Complete local baseline, record passed/failed/skipped tests and builds.
2. Complete real AgentMail magic-link login and read-only portal smoke checks, then sign out.
3. Publish the initialization PR with project instructions, repeatable validation and current findings.
4. Inspect PR #7 against current main; reconcile CapRover configuration/documentation in a separate focused change.
5. Verify deployed image revisions and obtain test Stripe configuration. Use `TEST-MATRIX.md` to work through website attribution, payment delivery and refund/payout cases.

## Pending environment/input

- Exact deployed API/router/portal image digests or commit IDs; public `/health` does not expose a deployed revision.
- Dedicated Stripe test-mode API key and OpenPartner endpoint-specific `STRIPE_WEBHOOK_SECRET_PLATFORM` for actual provider delivery tests. Add to a private test environment, separate from live `.env` credentials.
- Confirm website/API/router origin and staging URLs before mutating integration tests. Obtain only the configuration required for the chosen stage; production database credentials are not needed for local baseline tests.

No claim of full end-to-end or payout readiness is made while these checks remain open.
