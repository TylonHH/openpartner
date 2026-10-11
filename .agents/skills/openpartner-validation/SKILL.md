---
name: openpartner-validation
description: Run the OpenPartner local quality baseline with an isolated PostgreSQL fixture, record actual test execution and prepare focused origin pull requests.
---

# OpenPartner local validation

Use this workflow for a fresh checkout, changes to runtime code, or regression verification. Read root `AGENTS.md` and `docs/project/STATUS.md` first. Use Node 22 as the CI reference, pnpm 9 (repository pin: 9.11.0) and PostgreSQL 16. Record the actual local versions when they differ. Node 26's native `localStorage` shadows jsdom storage under the current Vitest version; do not interpret those SDK failures as browser application failures.

## Environment and database isolation

Never load production database, Stripe or mail credentials into destructive tests. Preserve root `.env`. `scripts/validate-local.mjs` pins a loopback test database and dummy admin/encryption keys in its child processes. It overrides integration credentials, including empty values so dotenv does not reload production Stripe/mail settings. The caller's environment stays unchanged. Do not replace its fixture URL with a remote connection.

Both `DATABASE_URL` and `DATABASE_URL_APP` must point to the fixture. Original main selects the app URL with nullish fallback: an empty string causes PostgreSQL to use its default localhost:5432 rather than the fixture. PR #12 fixes that optional-value behavior; pin both URLs regardless. This baseline uses the privileged fixture role, like CI; the multi-tenant suite separately drops privileges with `SET LOCAL ROLE openpartner_app` for RLS assertions.

The runner pins `OPENPARTNER_APP_DB_PASSWORD=op_app_local_fixture_only` for first migration so the non-superuser `openpartner_app` role is provisioned with a distinct fixture password. Existing migration history will not rerun a previously skipped app-role migration. For an old disposable fixture, deliberately recreate only its test database and rerun migrations, or provision that role through the existing migration code. Do not infer RLS coverage from Vitest's pass count: `multi-tenant.test.ts` can return before assertions when the role is absent. Confirm the role exists with LOGIN, no SUPERUSER and no BYPASSRLS, and that the missing-role warning does not occur.

Install dependencies once:

```powershell
rtk proxy pnpm install --frozen-lockfile
```

Inspect Docker before creating the dedicated fixture. If this name exists, verify it belongs to this project and uses the exact fixture configuration; do not reuse an unrelated container.

```powershell
rtk proxy docker ps -a --filter name=openpartner-codex-test-db
rtk proxy docker run --name openpartner-codex-test-db --label openpartner.purpose=local-validation -e POSTGRES_USER=openpartner -e POSTGRES_PASSWORD=openpartner -e POSTGRES_DB=openpartner_test -p 127.0.0.1:55433:5432 -d postgres:16-alpine
rtk proxy docker exec openpartner-codex-test-db pg_isready -U openpartner -d openpartner_test
rtk proxy node scripts/validate-local.mjs
```

If the workstation's default Node is newer, run through the repository-pinned Node version without changing global tools:

```powershell
rtk proxy npx --yes --package=node@22.20.0 -- node scripts/validate-local.mjs
```

For a focused check after the shared DB build/migration, arguments are passed to pnpm under the same isolated environment:

```powershell
rtk proxy npx --yes --package=node@22.20.0 -- node scripts/validate-local.mjs --filter @openpartner/api exec vitest run src/__tests__/session-cookie.test.ts
```

The focused log is `.cache/validation/targeted.log`.

The runner builds the shared database package, applies migrations, runs lint, typecheck, all workspace tests and production builds. Logs are private in `.cache/validation/*.log`. Read the test summary: database suites can silently skip when Postgres is unavailable. Report skipped tests explicitly and do not label them passed. A successful migration and running database are prerequisites, not proof all integration tests ran.

After verification, stop the owned test container when unused. Keep its name/configuration recorded; restarting is enough for the next run. Tests may truncate all application data in this fixture.

```powershell
rtk proxy docker stop openpartner-codex-test-db
```

Restart an existing verified fixture with `rtk proxy docker start openpartner-codex-test-db`. Do not delete another task's database or bind an existing production database.

## Interpretation and publication

- Inspect each failed check and reproduce the root cause before changing code. Keep environment/version failures distinct from application failures.
- Use the existing suite for a focused regression test. Repeat failed/affected checks after a fix. Broaden only when the fix changes shared behavior.
- Run `rtk proxy pnpm audit --audit-level=high --prod` separately. Record advisories and whether CI treats the audit as blocking. Do not update dependencies merely because a newer version exists.
- Update `docs/project/STATUS.md` and `TEST-MATRIX.md` with commit, environment, passed/failed/skipped counts and live-test limitations.
- Fetch `origin`; create a focused branch and PR against `TylonHH/openpartner:main`. Explain the concrete behavior and checks. Use a body file with real newlines. Never publish private logs, `.env`, mail bodies or session tokens.
- Verify resulting CI. A PR/image publication is separate from CapRover deployment. Keep production rollout tied to an explicit rollout instruction.

Update this skill when the test procedure changes or a repeatable failure gets a verified resolution.

## Authorized original-upstream contributions

Origin remains the default target. When the user explicitly requests submission to `getcoherence/openpartner`, fetch `upstream/main`, compare the affected files and check existing upstream PRs for duplicates. Create a separate worktree/branch from that upstream base and cherry-pick only the focused fix commit; do not submit the fork's deployment, dependency or project-management history.

Install the upstream frozen lockfile independently so checks use its actual dependency versions. Run shared DB build, migration and required lint/typecheck/test checks with the same disposable fixture and dummy environment; preserve production `.env`. Record exact test counts separately from fork/combined-preview results.

Push the branch to the user's fork (`origin`), then create the cross-repository PR with `--repo getcoherence/openpartner --base main --head TylonHH:<branch>` and a body file following upstream's PR template. Link the matching fork PR. Verify there is exactly the intended commit/file diff.

Read Actions status and external checks. Upstream fork workflows currently require maintainer approval (`action_required`); do not call them passing or try to approve on the maintainer's behalf. Its older dependency audit is blocking and currently fails; existing remediation is upstream PR #85. Report that baseline separately and keep the cookie/API fix focused. Record the upstream PR link/status in the project handoff and stop the local fixture when unused.
