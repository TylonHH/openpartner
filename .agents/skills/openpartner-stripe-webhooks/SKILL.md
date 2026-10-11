---
name: openpartner-stripe-webhooks
description: Verify OpenPartner Stripe environment mapping, endpoint subscriptions and safe signature probes without exposing credentials or mixing sandbox data into the live ledger.
---

# OpenPartner Stripe webhook checks

Read root `AGENTS.md`, `docs/project/STATUS.md` and the deployment section of `OVERVIEW.md`. Use this workflow when secrets, Stripe subscriptions or receiver configuration change. Reuse installed `dotenv`, Stripe SDK, CLI and standard-library tools; no new dependency is needed.

## Private input and runtime mapping

Read private environment files into memory with the installed dotenv parser. Never print secrets, pass them in command arguments, commit them, or load them into the destructive baseline runner.

| Input alias | Source | Runtime use |
| --- | --- | --- |
| `STRIPE_SECRET_KEY_SAND` | `.env.integration.local` | `STRIPE_SECRET_KEY` for the isolated sandbox application |
| `STRIPE_SECRET_KEY_PROD` | `.env.integration.local` | `STRIPE_SECRET_KEY` for the live application; read-only diagnostics during validation |
| `STRIPE_WHEC_SANDBOX` | `.env` | `STRIPE_WEBHOOK_SECRET_PLATFORM` for the Dashboard sandbox destination |
| `STRIPE_WHEC_PROD` | `.env` | `STRIPE_WEBHOOK_SECRET_PLATFORM` for the Dashboard live destination |

The live application's API key is supplied by its deployment and must be a live key. These aliases are not automatically read by OpenPartner. Separate website and OpenPartner destinations have separate signing secrets. Split platform/connect variables bind event families; they do not separate test and live mode. Comma-separated secrets support endpoint rotation, not an incidental invitation to mix live/test financial data in one database.

## Verification

1. Confirm only the expected input names and signing-secret/test-key/live-key formats, never their values. Authenticate the sandbox API key using a read such as `balance.retrieve()` and require `livemode=false`. When the provided live key is needed for diagnostics, read only and require `livemode=true`. Sandbox and LIVE currently belong to different accounts; compare CLI against sandbox, not live.
2. List webhook endpoints through the matching environment's Stripe SDK client. Select the exact verified OpenPartner HTTPS URL `/webhooks/stripe`; inspect status and event subscriptions, including `checkout.session.completed` and the revenue/refund events needed by the chosen flow. Distinguish independent API verification from user reports. Do not create or update live Stripe resources as a configuration check.
3. Inspect current receiver source before a signature-only probe. For the existing implementation, a `checkout.session.completed` payload with no tenant metadata, customer or `client_reference_id` exits with `unresolved_tenant` before attribution/financial writes. Generate its signature with the installed SDK, POST raw JSON to the verified origin with redirects disabled, and report only HTTP status and result. Use a clearly synthetic event ID. Never add a tenant/customer/click to this hosted smoke probe.
4. An accepted signature plus `unresolved_tenant` proves receiver configuration only. It does not prove genuine Stripe delivery, customer stitching, a paid event, commission or idempotency. A 400 `invalid_signature` means that endpoint secret is not accepted by the current receiver; do not change CapRover or combine modes as a test workaround.
5. Check CLI installation and identity with `rtk proxy stripe version` and `stripe whoami --format json`. On this workstation the npm PowerShell shim may require `rtk proxy powershell -NoProfile -Command 'stripe whoami --format json'`. Parse privately and emit only authentication, mode and account-match results.
6. `stripe listen --print-secret --skip-update` returns the CLI listener secret. Capture it privately; never expose raw output. Verify it differs from Dashboard secrets and use it only for the local CLI-forwarded receiver. Remove any ignored intermediate file after reading it. Normal verification should leave no forwarding listener active.

Do not run `stripe trigger` blindly: sandbox events can reach every configured destination, including the production-hosted OpenPartner, the development website and n8n. Trace those effects before genuine provider tests. Use disposable test identities, a separate local/staging ledger and the selected sandbox account. The application currently has no automatic `livemode` guard.

Record exact observations and remaining acceptance in `STATUS.md` and `TEST-MATRIX.md`. Keep earlier failures as history and distinguish an agent-signed synthetic probe from an event actually delivered by Stripe. Configuration checks do not require rerunning unchanged financial suites; integration code changes do.

Official references: [webhook signature troubleshooting](https://docs.stripe.com/events/manage-webhook-endpoints#signature-errors), [Stripe CLI](https://docs.stripe.com/cli), [webhook setup](https://docs.stripe.com/webhooks).
