# OpenPartner on CapRover for HörGeschenk

This fork keeps OpenPartner close to upstream and adds the deployment fixes required for the HörGeschenk self-hosted setup.

## Target layout

Use four CapRover apps:

- `openpartner-db` — PostgreSQL 16, internal only
- `openpartner-api` — OpenPartner API, container port `4601`
- `openpartner-router` — affiliate click / redirect service, container port `4701`
- `openpartner-portal` — partner/admin portal, container port `8080`

Public domains:

- Portal: `affiliate.warsowerk.de`
- API: `affiliate-api.warsowerk.de`
- Router: `go.warsowerk.de`
- Product: `hoerbuch.warsowerk.de`

Enable HTTPS and Force HTTPS for all three public OpenPartner apps. Do not expose PostgreSQL publicly.

## Images

The workflow `.github/workflows/caprover-images.yml` builds and publishes:

- `ghcr.io/tylonhh/openpartner-api:latest`
- `ghcr.io/tylonhh/openpartner-router:latest`
- `ghcr.io/tylonhh/openpartner-portal:latest`

The `latest` tag is published from `main`.

## One-click template

`caprover/one-click.yml` provisions PostgreSQL, API, router and portal in one CapRover stack.

CapRover generates internal credentials automatically for:

- PostgreSQL owner password
- RLS-enabled `openpartner_app` role password
- `ADMIN_API_KEY`
- `SECRETS_ENCRYPTION_KEY`
- `METRICS_TOKEN`

Keep generated passwords and encryption keys stable after the first deployment.

### External values

Provide:

- Resend API key (`re_...`)
- sender address on a domain verified in Resend
- Stripe secret key when Stripe attribution is enabled
- Stripe webhook signing secret for the OpenPartner platform-event destination when Stripe attribution is enabled

The template defaults to the production HörGeschenk domains listed above.

## Email / Resend

The API uses generic SMTP through Nodemailer:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=resend
SMTP_PASSWORD=<RESEND_API_KEY>
MAIL_FROM=HörGeschenk <noreply@warsowerk.de>
```

OpenPartner needs outbound email for magic links, invitations and notifications. No inbound mailbox is required. UI mail settings take precedence over the environment fallback.

## Core runtime environment

### API

```env
NODE_ENV=production
OPENPARTNER_MODE=selfhost
OPENPARTNER_TENANCY=single
DATABASE_URL=postgres://openpartner:<DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
DATABASE_URL_APP=postgres://openpartner_app:<APP_DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
OPENPARTNER_APP_DB_PASSWORD=<APP_DB_PASSWORD>
API_PORT=4601
ADMIN_API_KEY=<AUTO_GENERATED>
SECRETS_ENCRYPTION_KEY=<AUTO_GENERATED>
PORTAL_URL=https://affiliate.warsowerk.de
OPENPARTNER_OUTBOUND_ALLOWED_PORTS=80,443
OPENPARTNER_STORAGE_KIND=fs
OPENPARTNER_STORAGE_FS_DIR=/var/lib/openpartner/uploads
OPENPARTNER_STORAGE_FS_PUBLIC_BASE=https://affiliate-api.warsowerk.de/uploads
METRICS_TOKEN=<AUTO_GENERATED>
```

For HörGeschenk Stripe attribution, add:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET_PLATFORM=whsec_...
```

`STRIPE_WEBHOOK_SECRET` is the legacy combined webhook secret. Do not add it for a new deployment when `STRIPE_WEBHOOK_SECRET_PLATFORM` is available.

The OpenPartner Stripe event destination should point to:

```text
https://affiliate-api.warsowerk.de/webhooks/stripe
```

For the initial HörGeschenk integration, the minimum conversion events are:

- `customer.created`
- `customer.subscription.created`
- `invoice.paid`

For production commission accounting, also subscribe to refund/failure/lifecycle events used by OpenPartner, especially `charge.refunded`, `charge.dispute.created`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`.

### Persistent uploads

The API stores filesystem-backed logos, favicons and brand assets at:

```text
/var/lib/openpartner/uploads
```

The CapRover template attaches a named volume there. The OpenPartner API image runs as UID/GID `1000`, so an existing or freshly-created root-owned volume may need its mountpoint ownership adjusted once on the Docker host:

```bash
sudo chown -R 1000:1000 /var/lib/docker/volumes/captain--openpartner-api-uploads/_data
sudo chmod -R u+rwX /var/lib/docker/volumes/captain--openpartner-api-uploads/_data
```

Use the actual Docker volume name if the CapRover app name differs.

### Router

```env
NODE_ENV=production
OPENPARTNER_MODE=selfhost
OPENPARTNER_TENANCY=single
DATABASE_URL=postgres://openpartner:<DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
ROUTER_PORT=4701
COOKIE_DOMAIN=.warsowerk.de
VELOCITY_MAX=20
VELOCITY_WINDOW_MS=60000
```

The `.warsowerk.de` cookie scope allows the click router at `go.warsowerk.de` to stitch attribution to the product app at `hoerbuch.warsowerk.de`.

### Portal

```env
API_UPSTREAM=srv-captain--openpartner-api:4601
```

The portal nginx container proxies `/api/*` internally to the API.

## Existing installations

Do not re-run the One-Click template over an existing installation just to pick up changes. Apply new environment variables and storage mounts directly in the existing CapRover apps.

For the current HörGeschenk deployment, verify these API variables are present:

```env
DATABASE_URL_APP=postgres://openpartner_app:<APP_DB_PASSWORD>@srv-captain--openpartner-db:5432/openpartner
OPENPARTNER_APP_DB_PASSWORD=<APP_DB_PASSWORD>
OPENPARTNER_OUTBOUND_ALLOWED_PORTS=80,443
OPENPARTNER_STORAGE_KIND=fs
OPENPARTNER_STORAGE_FS_DIR=/var/lib/openpartner/uploads
OPENPARTNER_STORAGE_FS_PUBLIC_BASE=https://affiliate-api.warsowerk.de/uploads
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET_PLATFORM=whsec_...
```

Verify the router uses:

```env
COOKIE_DOMAIN=.warsowerk.de
```

After changing API environment variables, deploy/restart the API app. After changing router environment variables, deploy/restart the router app. The portal does not need redeployment for these environment changes.

## Database migrations and RLS app role

The API image runs migrations at startup. `OPENPARTNER_APP_DB_PASSWORD` allows the boot-time reconciliation step to provision/rotate the `openpartner_app` role. `DATABASE_URL_APP` then routes tenant-scoped API work through that non-superuser role so PostgreSQL RLS remains active as defense in depth.

The privileged `DATABASE_URL` remains required for migrations and platform-wide operations.

### Retrofitting RLS onto an existing database

If an installation originally ran without `OPENPARTNER_APP_DB_PASSWORD` and later enables `DATABASE_URL_APP`, the `openpartner_app` role must have both the matching password and DML grants for the current tenant tables. Typical failures are:

```text
password authentication failed for user "openpartner_app"
permission denied for table Program
```

The API entrypoint runs `ensure-app-role` on every boot to reconcile the password and grants. Older images may still carry a stale table list from before `Campaign` / `PartnerCampaign` were renamed to `Program` / `PartnerProgram`. In that case, either deploy an image containing the renamed-table grant fix or repair the role once with the privileged database user:

```sql
GRANT CONNECT ON DATABASE openpartner TO openpartner_app;
GRANT USAGE ON SCHEMA public TO openpartner_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO openpartner_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO openpartner_app;
ALTER DEFAULT PRIVILEGES FOR ROLE openpartner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO openpartner_app;
ALTER DEFAULT PRIVILEGES FOR ROLE openpartner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO openpartner_app;
```

Keep `OPENPARTNER_APP_DB_PASSWORD` and the password embedded in `DATABASE_URL_APP` identical. Prefer a URL-safe random value (for example hex) so the PostgreSQL URL does not require additional escaping.

## HörGeschenk integration boundary

Keep OpenPartner separate from the main HörGeschenk application and integrate through APIs/events.

Recommended ownership:

- HörGeschenk checkout: order/payment source of truth
- OpenPartner: affiliate links, referrals, partner accounts, attribution and commission ledger
- Stripe: payment/refund status
- PostHog: product analytics and funnel reporting, not commission accounting

Before paying commissions, test referrals, discount-code attribution, duplicate/self referrals, refunds, cancellations and consent behavior.
