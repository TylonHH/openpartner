import express, { Router } from 'express';
import { TABLES } from '@openpartner/db';
import { requireAuth, requireAdmin } from '../auth.js';
import { tenantOf } from '../tenancy.js';
import { sendHeartbeat } from '../network-client.js';
import { fsStorageDir, getStorage, MAX_UPLOAD_BYTES, newUploadKey, UploadError, validateImageUpload } from '../storage.js';
import { brandAssetUploadHandler, handleBrandAssetUpload } from './brand-resources.js';

export const uploadsRouter = Router();

// ---------- Brand logo upload ----------
//
// Single binary body: client sends the image as the raw request body,
// Content-Type header carries the mime, X-Tenant-Slug etc are pulled
// from the tenant middleware. Returns the public URL after writing to
// storage AND stamping it onto the Tenant row in one transactional-ish
// shot (file write first; if DB update fails the file is orphaned but
// harmless — no link to anything).
//
// Capped at 2 MB by validateImageUpload + the express.raw limit.
uploadsRouter.post(
  '/uploads/logo',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: MAX_UPLOAD_BYTES,
  }),
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { db, tenantId } = tenantOf(req);

    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: 'empty_body' });
    }
    let validated;
    try {
      validated = validateImageUpload(req.header('content-type'), body.length);
    } catch (err) {
      if (err instanceof UploadError) return res.status(400).json({ error: err.code, detail: err.message });
      throw err;
    }

    const key = newUploadKey(`tenants/${tenantId}/logos`, validated.ext);
    await getStorage().put(key, body, { contentType: validated.contentType });
    const url = getStorage().publicUrl(key);

    await db(TABLES.Tenant).where({ id: tenantId }).update({ logoUrl: url, updatedAt: new Date() });

    sendHeartbeat(db, tenantId).catch((err) => {
      console.error('[uploads/logo] opportunistic heartbeat failed', err);
    });

    res.json({ logoUrl: url });
  },
);

// ---------- Favicon upload ----------
uploadsRouter.post(
  '/uploads/favicon',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: MAX_UPLOAD_BYTES,
  }),
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { db, tenantId } = tenantOf(req);
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: 'empty_body' });
    }
    let validated;
    try {
      validated = validateImageUpload(req.header('content-type'), body.length);
    } catch (err) {
      if (err instanceof UploadError) return res.status(400).json({ error: err.code, detail: err.message });
      throw err;
    }
    const key = newUploadKey(`tenants/${tenantId}/favicons`, validated.ext);
    await getStorage().put(key, body, { contentType: validated.contentType });
    const url = getStorage().publicUrl(key);
    await db(TABLES.Tenant).where({ id: tenantId }).update({ faviconUrl: url, updatedAt: new Date() });
    res.json({ faviconUrl: url });
  },
);

// ---------- Brand asset image upload ----------
uploadsRouter.post(
  '/uploads/brand-asset',
  brandAssetUploadHandler,
  requireAuth,
  requireAdmin,
  handleBrandAssetUpload,
);

// ---------- Static handler for FS backend ----------
//
// Only GET/HEAD should be handled by express.static. The handler is mounted
// before the authenticated upload router in app.ts, so letting it see POST
// requests causes express.static (with fallthrough:false) to answer 405 and
// shadow /uploads/logo, /uploads/favicon and /uploads/brand-asset.
export function mountStaticUploads(app: import('express').Express): void {
  const dir = fsStorageDir();
  if (!dir) return;

  const staticUploads = express.static(dir, {
    maxAge: '365d',
    immutable: true,
    fallthrough: false,
    index: false,
    // Uploaded logos, favicons and brand assets are intentionally public
    // and may be embedded by the portal or Network from a different origin.
    // Helmet's default CORP header is same-origin, which blocks these assets
    // when API and portal use separate hosts (for example api.example.com
    // and portal.example.com). Override it for this public asset surface.
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  app.use('/uploads', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    return staticUploads(req, res, next);
  });
}
