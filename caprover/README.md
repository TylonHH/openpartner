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

The `latest` tag is published from `main`. The feature branch publishes a `caprover-deploy` tag while testing.

If GHCR packages are private, configure the GHCR registry credentials in CapRover or make the packages public before deployment.

## Required secrets

Generate these locally. Never commit the resulting values.

### ADMIN_API_KEY

```bash
node -e "console.log('op_' + require('crypto').randomBytes(24).toString('hex'))"
```

### SECRETS_ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### PostgreSQL password

Use at least 24 random characters.

## Core environment

### API

```env
NODE_ENV=production
OPENPARTNER_MODE=selfhost
OPENPARTNER_TENANCY=single
DATABASE_URL=postgres://openpartner:<DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
API_PORT=4601
ADMIN_API_KEY=<GENERATED_ADMIN_API_KEY>
SECRETS_ENCRYPTION_KEY=<GENERATED_64_HEX_KEY>
PORTAL_URL=https://affiliate.hoerbuch.warsowerk.de
```

Optional but recommended:

```env
MAIL_FROM=HörGeschenk <noreply@warsowerk.de>
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
METRICS_TOKEN=<RANDOM_TOKEN>
```

OpenPartner self-host mode does not require the platform billing Stripe variables. Do not add Stripe secrets unless they are actually needed for the HörGeschenk integration.

### Router

```env
NODE_ENV=production
OPENPARTNER_MODE=selfhost
OPENPARTNER_TENANCY=single
DATABASE_URL=postgres://openpartner:<DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
ROUTER_PORT=4701
COOKIE_DOMAIN=.hoerbuch.warsowerk.de
VELOCITY_MAX=20
VELOCITY_WINDOW_MS=60000
```

Using `.hoerbuch.warsowerk.de` permits first-party attribution between the HörGeschenk site and the `go.` / `affiliate.` subdomains. Confirm the final tracking/consent implementation before production use.

### Portal

```env
API_UPSTREAM=srv-captain--openpartner-api:4601
```

The portal nginx container proxies `/api/*` internally to the API.

## One-click template

`caprover/one-click.yml` provisions PostgreSQL, API, router and portal in one CapRover stack.

Because CapRover domain and TLS configuration is installation-specific, complete these steps after the stack is created:

1. Assign `affiliate.hoerbuch.warsowerk.de` to the portal app.
2. Assign `affiliate-api.hoerbuch.warsowerk.de` to the API app.
3. Assign `go.hoerbuch.warsowerk.de` to the router app.
4. Enable HTTPS for each public app.
5. Enable Force HTTPS.
6. Keep the database app without a public domain.

## Deploy directly from GitHub instead of GHCR

The repository also contains separate Captain definitions:

- `caprover/captain-definition.api`
- `caprover/captain-definition.router`
- `caprover/captain-definition.portal`

When configuring a CapRover app from GitHub, point its Captain Definition Path to the matching file and add the environment variables above.

## Database migrations

The OpenPartner API image runs the migration bundle on container startup. A new empty PostgreSQL database is therefore initialized by the API on first boot.

## HörGeschenk integration boundary

Keep OpenPartner separate from the main HörGeschenk application. Integrate through documented APIs/events rather than copying affiliate logic into the website.

Recommended ownership:

- HörGeschenk checkout: order/payment source of truth
- OpenPartner: affiliate links, referrals, partner accounts, commission ledger
- Stripe: payment/refund status
- PostHog: product analytics and funnel reporting, not commission accounting

For the first production integration, explicitly test referrals, discount-code attribution, duplicate/self referrals, refunds, cancellations and consent behavior before paying commissions.
