# Proposal: Resend preset for email delivery

## Summary

OpenPartner already supports Resend through the existing SMTP/Nodemailer transport. This proposal adds a small provider preset in **Settings → Email delivery** so users do not need to know or enter Resend's SMTP details manually.

The preset should remain an SMTP configuration internally; no new mail transport is required.

## Proposed UX

Add **Resend** to the provider selector alongside SMTP, Postmark and None.

When Resend is selected, only show:

- **From address** — must use a sender/domain verified in Resend
- **Resend API key** — stored using the existing encrypted SMTP password field

OpenPartner fills the SMTP configuration automatically:

```text
host: smtp.resend.com
port: 465
secure: true
user: resend
password: <Resend API key>
```

The existing **Send test email** action continues to work unchanged because the saved configuration is still SMTP.

## Backwards compatibility

No database migration or new transport kind is required.

A Resend preset can be represented as the current `smtp` mail kind with the values above. Existing SMTP and Postmark configurations continue to work unchanged.

For an existing SMTP configuration, the portal can optionally recognize it as Resend when:

- host is `smtp.resend.com`
- user is `resend`

If the values differ from the preset, the UI should fall back to displaying it as custom SMTP rather than rewriting the configuration.

## Implementation outline

The smallest implementation is portal-only:

1. Keep the API payload as `kind: "smtp"`.
2. Add a UI-only provider choice such as `resend`.
3. On save, map `resend` to the existing SMTP payload with the preset host/port/TLS/user values.
4. Store the API key in the existing encrypted SMTP password field.
5. On load, detect the preset SMTP values and show `Resend` in the selector.
6. Keep the generic SMTP form available as `Custom SMTP`.

This avoids duplicating delivery logic in `mailer.ts` and keeps credential encryption/rotation behavior unchanged.

## Why

Resend is commonly used for transactional email in self-hosted and developer-focused applications. OpenPartner already supports it technically, but the generic SMTP form asks users for host, port, TLS and username values that are fixed for Resend. A preset reduces setup friction without adding another provider-specific mail implementation or API dependency.

## Suggested provider selector

- Resend
- Custom SMTP
- Postmark HTTP API
- None / environment fallback

The change should be intentionally small and provider-specific only at the UI layer.