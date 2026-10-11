# Acceptance and test matrix

Status vocabulary: **passed** (specific executed check), **failed** (reproduced failure), **pending** (not executed), **blocked** (missing external input), **partial** (only a subset exercised). Automated tests with skipped database suites are not evidence of a passing integration.

## Initial baseline, 2026-10-11

| Area | Required evidence | Initial status |
| --- | --- | --- |
| Dependency installation | Frozen lockfile installs without edits | Passed |
| Schema | All migrations apply to isolated PostgreSQL 16 fixture | Passed |
| Static quality | Shared DB build, lint and typecheck | Passed; five existing lint warnings |
| Automated runtime checks | API, router, SDK and portal suites; pass/fail/skip counts recorded | Main 546/546; combined PR preview 554/554 in 54 files, no reported skips |
| Database tenant isolation | Non-superuser app role exists; RLS assertions execute | Passed in combined preview; nine multi-tenant cases, no missing-role warning |
| Production build | Every workspace builds | Initial main SDK declarations failed; fixed by merged PR #14. Final main `fe89fbd` CI and combined preview pass all workspace builds |
| Image publication | API/router/portal images exist and revision labels match final main | Passed for `latest` and `sha-fe89fbd` at `fe89fbdb54f93d540014748e16dc29ba8ab06837`; final main CI passed. CapRover rollout remains pending |
| Dependency audit | High/critical production advisories recorded | Passed at high threshold; 2 low/17 moderate remain |
| Public deployment | Portal 200, API health 200 on verified current origins | Passed again after user-reported redeployment; deployed revision unknown |
| API-key auth | Live whoami reports admin/env; admin/program reads succeed | Passed |
| Magic-link delivery | Own AgentMail inbox receives admin invitation | Passed |
| Magic-link browser login | Fresh context, named session, portal navigation, no unexpected errors | Passed again after redeployment; named admin and seven pages verified; first invitation anomaly still unresolved |
| Token lifecycle | Used token rejected, signout removes access and cookie | Post-deployment token rejection/access revocation passed; blank cookie still persists for 30 days, PR #13 not effective yet |
| Program read access | Bearer/session agree on the existing program | Passed; same one program |
| Stripe sandbox access | Test key authenticates; existing endpoint subscriptions inspected | Passed, livemode=false; Checkout completion subscription now verified, sandbox/prod signing-secret aliases provided |
| Stripe live reads | Live key authenticates; existing endpoint subscriptions inspected without mutations | Passed, livemode=true; enabled PROD destination includes Checkout completion; account differs from sandbox |
| Hosted webhook signature | Safe unmapped Checkout probe authenticates with the deployed secret | Post-deployment PROD-secret probe 200/skipped; SANDBOX/wrong/missing signatures 400; genuine provider delivery still pending |
| Stripe CLI | Same sandbox account, test mode, separate listener secret | Passed; no trigger or forwarding listener left running |

## Full functional acceptance

Run mutating cases against local fixtures/staging with test Stripe keys. Live production reads and authorized login mail may be checked separately. Real payout execution is outside an incidental test run.

| Flow | Cases and expected outcome | Status |
| --- | --- | --- |
| Installation | Empty instance bootstrap, first admin activation, repeat install refused | Pending |
| Authentication | Admin/partner magic links, expired/reused links, revoke, signout, key scopes, clean browser state | Partial; mail and env bearer verified |
| Admin portal | Dashboard, program list/detail, partner list/invite, links, settings, exports, upload display | Partial; seven read-only portal pages render; invitation to own test admin delivered |
| Partner portal | Named partner login, own links/dashboard, exclusion of another partner's records | Pending |
| Programs | Valid creation/update, rules, campaign association, inactive program behavior | Pending; policy selection belongs to later administration |
| Click router | Actual referral URL redirects, valid click stored, `_cref` and query handoff, invalid link, velocity guard | Pending; root 404 alone is not a functional check |
| Identity | Click tied to website account or Stripe customer consistently; login/signup/cross-session handoff | Pending |
| Signup conversion | One eligible signup reaches the intended program/partner | Pending |
| One-time payment | Website Checkout credits remain correct; exactly one paid-revenue event and commission in EUR | Pending; sandbox key, endpoint secret and Checkout subscription available; isolated provider/website flow still required |
| Subscriptions | First invoice and renewals, cancellation, delayed/out-of-order events, failed payment | Pending for real sandbox delivery; local mocked suites passed |
| Idempotency | Repeated provider webhook and failed-forwarding retry produce one financial result | Pending |
| Existing referral rewards | `?ref` customer credit awards remain distinct from affiliate commissions | Pending |
| Refunds/disputes | Full refund reverses eligible unpaid commission; partial refund/manual review; paid commissions flagged | Pending |
| Coupon attribution | Valid/invalid code, link+code precedence, duplicate and self referral | Pending |
| Payout readiness | Approval, cadence, currency, funding interlocks, accounting; test Connect/manual rail | Pending; no production payout execution |
| Consent/privacy | No optional referral storage/requests before applicable consent; revocation, safe identifiers | Pending |
| Security | Tenant/partner boundaries, CSRF/CORS, signature failures, invalid inputs, export authorization | Partial; local automated suite and RLS passed, full deployed acceptance pending |
| Storage/deployment | Upload persistence through restart, permissions, proxy/CORS/cookie configuration, pinned image versions | Pending |
| Compatibility | Chrome/mobile, Firefox/Safari behavior where available; existing landing/demo/invoice flows | Pending |

Update this matrix after each meaningful executed check. Link reproducible evidence and PRs from `STATUS.md`; do not put credentials or personal customer records here.
