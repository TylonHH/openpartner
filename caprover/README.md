# OpenPartner on CapRover for HörGeschenk

This fork keeps the upstream OpenPartner application unchanged and adds a thin CapRover deployment layer.

## Target layout

Use four CapRover apps:

- `openpartner-db` — PostgreSQL 16, internal only
- `openpartner-api` — OpenPartner API, container port `4601`
- `openpartner-router` — affiliate click / redirect service, container port `4701`
- `openpartner-portal` — partner/admin portal, container port `8080`

Recommended public domains:

- Portal: `affiliate.hoerbuch.warsowerk.de`
- API: `affiliate-api.hoerbuch.warsowerk.de`
- Router: `go.hoerbuch.warsowerk.de`

Enable HTTPS and Force HTTPS for all three public apps. Do not expose PostgreSQL publicly.

## Images

The workflow `.github/workflows/caprover-images.yml` builds and publishes:

- `ghcr.io/tylonhh/openpartner-api:latest`
- `ghcr.io/tylonhh/openpartner-router:latest`
- `ghcr.io/tylonhh/openpartner-portal:latest`

The `latest` tag is published from `main`.

## One-click template

`caprover/one-click.yml` provisions PostgreSQL, API, router and portal in one CapRover stack.

CapRover generates the internal credentials automatically via `$$cap_gen_random_hex(...)`:

- PostgreSQL password
- `ADMIN_API_KEY`
- `SECRETS_ENCRYPTION_KEY`
- `METRICS_TOKEN`

Do not replace these generated values unless you have a specific reason. In particular, keep the database password and encryption key stable after the first deployment.

### Values you actually provide

For the HörGeschenk preset, only external configuration is required:

- Resend API key (`re_...`)
- sender address on a domain verified in Resend
- optionally adjust the pre-filled portal and cookie domains

PostgreSQL user/database names, ports, service-to-service hostnames and OpenPartner runtime modes are already defined by the template.

## Email / Resend

OpenPartner needs email only for outbound transactional messages such as magic-login links, admin/partner invitations and notifications. It does not require an inbound mailbox.

The application already supports generic SMTP through Nodemailer, so no OpenPartner code modification is required for Resend. The One-Click template configures:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=resend
SMTP_PASSWORD=<RESEND_API_KEY>
MAIL_FROM=HörGeschenk <noreply@warsowerk.de>
```

Only `SMTP_PASSWORD` (your Resend API key) and a valid `MAIL_FROM` need to come from you. The sender/domain must be verified in Resend.

OpenPartner also supports configuring mail later from its admin UI; UI settings take precedence over environment fallback settings.

## Core runtime environment

### API

```env
NODE_ENV=production
OPENPARTNER_MODE=selfhost
OPENPARTNER_TENANCY=single
DATABASE_URL=postgres://openpartner:<AUTO_DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
API_PORT=4601
ADMIN_API_KEY=<AUTO_GENERATED>
SECRETS_ENCRYPTION_KEY=<AUTO_GENERATED>
PORTAL_URL=https://affiliate.hoerbuch.warsowerk.de
METRICS_TOKEN=<AUTO_GENERATED>
```

OpenPartner self-host mode does not require the platform billing Stripe variables. Add Stripe credentials only when the HörGeschenk integration actually needs them.

### Optional creator Network

For the current hosted Network API, set `NETWORK_URL=https://network.openpartner.dev/api`
on the API app. Self-hosted instances connect through the portal's email-verification
flow; `NETWORK_ADMIN_API_KEY` belongs to the Network operator and is not required.

The portal proxy preserves `X-Forwarded-Proto` so Network registration uses the
public HTTPS scheme after TLS terminates at CapRover. Keep the portal container
behind a trusted ingress that overwrites client-supplied forwarding headers.
Ensure the ingress forwards `X-Forwarded-Proto: https` for HTTPS requests.

### Router

```env
NODE_ENV=production
OPENPARTNER_MODE=selfhost
OPENPARTNER_TENANCY=single
DATABASE_URL=postgres://openpartner:<AUTO_DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
ROUTER_PORT=4701
COOKIE_DOMAIN=.hoerbuch.warsowerk.de
VELOCITY_MAX=20
VELOCITY_WINDOW_MS=60000
```

Using `.hoerbuch.warsowerk.de` permits first-party attribution across the HörGeschenk and tracking subdomains. Confirm the final consent implementation before production use.

### Portal

```env
API_UPSTREAM=srv-captain--openpartner-api:4601
```

The portal nginx container proxies `/api/*` internally to the API.

## After One-Click deployment

1. Assign `affiliate.hoerbuch.warsowerk.de` to the portal app.
2. Assign `affiliate-api.hoerbuch.warsowerk.de` to the API app.
3. Assign `go.hoerbuch.warsowerk.de` to the router app.
4. Enable HTTPS and Force HTTPS for all three public apps.
5. Keep the database app without a public domain.
6. Complete OpenPartner's `/install` flow.

## Database migrations

The OpenPartner API image runs migrations at container startup. A new empty PostgreSQL database is initialized automatically on first boot.

## HörGeschenk integration boundary

Keep OpenPartner separate from the main HörGeschenk application and integrate through APIs/events.

Recommended ownership:

- HörGeschenk checkout: order/payment source of truth
- OpenPartner: affiliate links, referrals, partner accounts, commission ledger
- Stripe: payment/refund status
- PostHog: product analytics and funnel reporting, not commission accounting

Before paying commissions, test referrals, discount-code attribution, duplicate/self referrals, refunds, cancellations and consent behavior.
