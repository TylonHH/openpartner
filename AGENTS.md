# OpenPartner project instructions

## Mission and scope

Manage this checkout of `TylonHH/openpartner`, verify the complete affiliate flow, and prepare focused pull requests to `origin` for confirmed bugs and useful optimizations. Integrate HörGeschenk (`TylonHH/TEST_website`) and Stripe through their existing APIs and events. Affiliate program administration is a later workstream; do not invent commission rates or payout policies.

Read `docs/project/STATUS.md` at the start of each task. Consult `docs/project/OVERVIEW.md` for architecture, branches, authentication and integration decisions, and `docs/project/TEST-MATRIX.md` for acceptance criteria. Record significant work and verification evidence in `STATUS.md` before and after changes. Keep failed, skipped, blocked and passed checks distinct.

## Local defaults

- On René's workstation, read `C:\Users\Rene\.codex\RTK.md` and prefix shell commands with `rtk`; use `rtk proxy` for unsupported commands.
- Use `C:\Users\Rene\.agents\skills\caveman\SKILL.md` for concise German chat responses, at full intensity unless disabled by the user. Write persisted documentation, code comments and PR descriptions in normal prose.
- Use `C:\Users\Rene\.agents\skills\ponytail\SKILL.md` for coding at full intensity unless disabled. Prefer existing code, platform features and installed dependencies. Preserve correctness, security and accessibility.
- On other machines, apply the equivalent concise communication and minimal implementation principles if these workstation files are absent.
- Do not spawn subagents unless the user or an applicable instruction explicitly requests delegation.

## Repositories and branches

- `origin`: https://github.com/TylonHH/openpartner.git; primary base: `origin/main`.
- `upstream`: https://github.com/getcoherence/openpartner.git; reference for upstream comparison. PRs go to `origin` unless the user requests upstream submission.
- Create one focused branch per change from current `origin/main`. Fetch before selecting a base. Keep changes already under review separate.
- Never delete, merge, reset or force-push historical branches as incidental cleanup. Inspect ancestry and patch equivalence first; preserve existing PR #7 for separate review.
- HörGeschenk's existing checkout is `F:\_CODEX\_AudioBook\TEST_website`. It contains unpublished work and a stale local `main`. Inspect its own `AGENTS.md` and use a new isolated worktree from current `origin/main` before integration edits. Do not reset or include another task's changes.
- Commit coherent changes, run relevant checks and create reviewable PRs with exact evidence and remaining limitations. This project authorizes PR creation; merges and production rollout require a concrete rollout instruction.

## Architecture and correctness

Honor `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` and `SECURITY.md`. Raw clicks/events stay immutable; attribution is derived; ledger history and exports remain portable. Schema changes require new migrations. Preserve tenant isolation and row-level security. Do not turn the application into a merchant of record.

Trace changes through `apps/router`, `apps/api`, `apps/portal`, `packages/db` and `packages/sdk` as applicable. Add a focused regression check for nontrivial bug fixes, particularly money, identity, idempotency and security paths. Reuse the existing Vitest suites.

## Credentials and authentication

- Root `.env` is private and holds production `ADMIN_API_KEY`, `agentmail_api`, and the endpoint-secret aliases `STRIPE_WHEC_PROD` / `STRIPE_WHEC_SANDBOX`. API-key aliases `STRIPE_SECRET_KEY_SAND` and `STRIPE_SECRET_KEY_PROD` are in `.env.integration.local`. Never print, commit, copy into reports or expose these values to the browser. Existing `.gitignore` excludes local environment files and `.cache`.
- Human and agent portal login uses the email magic link as the primary method. `ADMIN_API_KEY` is a headless bootstrap/recovery credential; compare its behavior separately instead of treating it as equivalent to a named admin session.
- The user authorizes retrieving their login mail from Gmail and using the project's own AgentMail inbox for login tests. Limit mailbox access to relevant login messages. Do not send unrelated mail.
- AgentMail project inbox uses `client_id=openpartner-codex`. Discover/reuse it; do not create a new inbox on every task. API key remains in `.env`; login tokens and session cookies remain in memory or ignored private files only.
- Use only verified HTTPS origins when supplying credentials. Production domains differ from `main`'s old CapRover documentation; consult the status record.
- Local integration tests truncate database tables. Use only the dedicated disposable database in the validation skill; never point tests or migration experiments at CapRover/production. Use dummy test keys and prevent live Stripe/mail credentials from entering tests.
- Real purchases, transfers, refunds, exports containing customer data and deployment changes require a concrete task scope. Do not trigger them as incidental smoke tests.

## Repeatable workflows

Use `.agents/skills/openpartner-validation/SKILL.md` for local verification, `.agents/skills/openpartner-magic-login/SKILL.md` for the authorized mailbox/login workflow, and `.agents/skills/openpartner-stripe-webhooks/SKILL.md` for secret mapping and Stripe environment checks. Update a skill after its procedure changes or a recurring failure is understood. Add a skill when another workflow actually repeats; avoid speculative scaffolding.

Keep the acceptance matrix current. A green automated suite does not establish live browser correctness, Stripe delivery, refund correctness or payout readiness. Mark the integration complete only when the recorded end-to-end checks pass.
