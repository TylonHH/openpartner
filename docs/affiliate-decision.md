# Cross-network purchase decisions

OpenPartner can honor a server-signed merchant purchase decision when an external network such as Awin runs alongside direct partners. Existing unsigned events retain their current behavior. The API does not call Awin or create its program; the companion merchant integration owns source capture and reporting.

Set a server-only `AFFILIATE_DECISION_SECRET` of at least 32 random characters in both OpenPartner API and the merchant backend. Keep verification of existing subscription proofs available; this version supports one verification key. Do not expose this key to a browser or reuse it between unrelated instances.

The backend signs the exact JSON string in `affiliate_decision` with HMAC-SHA256 and writes the hexadecimal result into `affiliate_signature`. The payload has `v: 1`, `tenantId`, authenticated `userId` (or an isolated guest ID), unique purchase `scope`, `winner` (`awin`, `openpartner`, `none`), `clickId` (only for OpenPartner) and integer acquisition `ts` in milliseconds. Include `openpartner_tenant_id` in the Stripe metadata. The example merchant implementation is documented in HörGeschenk's `docs/awin-openpartner.md`.

Before signing an OpenPartner choice, the merchant can use `GET /attribution/clicks/:id` with its server-only `events:write` credential. This tenant-scoped endpoint returns the click ID, original timestamp and program attribution window, and rejects absent/fraud-flagged clicks. It exposes no customer data. Identity stitching still uses the existing identify route. The partner's current revocation and program rules are checked when attribution runs.

Attach the same signed decision to Checkout Session metadata and its PaymentIntent or Subscription metadata. Invoice snapshots or a verified Subscription retrieval supply it for renewals. The signed decision is copied into the immutable Event metadata and checked in `attributeEvent`, including backlog processing. An invalid or unconfigured marked proof fails processing and must be fixed before retrying; it never silently falls back to the legacy model.

- An Awin winner records the Event but produces no OpenPartner attribution/commission.
- An OpenPartner winner restricts attribution to the selected tenant click. Its acquisition timestamp governs the initial eligibility window on renewals; normal program lifecycle, revocation and recurring commission limits still apply.
- A purchase with no eligible link excludes old stitched identities. A matched code in that Stripe event can use the existing coupon flow; a valid link has priority over coupons. Awin winners cannot be reattributed by OpenPartner codes.

Signed one-time checkouts without invoices produce paid revenue when payment is confirmed. Invoice-backed checkouts produce their paid result only on `invoice.paid`. Signed financial results use a tenant-qualified financial-object reference for deduplication, independent of Stripe delivery IDs. Full one-time refunds can resolve their original PaymentIntent-backed Event; early signed full refunds prevent later accrual. Partial refunds and disputes retain the existing review process. Missing historical mappings remain an operational reconciliation concern.

For consent-aware destination sites, set router `REFERRAL_COOKIE_ENABLED=false`: the raw click and `cref` query handoff remain available, while the router does not store `_cref` before opt-in. The default preserves existing integrations. Coordinate this setting with the merchant consent bridge and remove conflicting independent SDK/tag reporting before enabling it.

Automated tests verify signature/tenant/user binding, both legacy and signed flows, financial deduplication, acquisition pinning, early and late full refunds, and tenant isolation. These checks do not establish live Awin attribution, consent approval, subscription commission terms, production delivery or payouts. Enable only after the merchant's documented rollout and acceptance checks.
