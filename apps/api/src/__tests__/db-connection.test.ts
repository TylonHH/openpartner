import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createDb } = vi.hoisted(() => ({ createDb: vi.fn().mockResolvedValue({}) }));
vi.mock('@openpartner/db', () => ({ createDb }));

beforeEach(() => {
  vi.resetModules();
  createDb.mockClear();
  vi.stubEnv('DATABASE_URL', 'postgres://migration:fixture@localhost:55433/openpartner_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('optional application database URL', () => {
  it.each([undefined, '', '  '])('falls back to the migration URL when app URL is %j', async (appUrl) => {
    vi.stubEnv('DATABASE_URL_APP', appUrl);
    await import('../db.js');
    expect(createDb).toHaveBeenNthCalledWith(1, {
      connectionString: process.env.DATABASE_URL, bypassRls: true,
    });
    expect(createDb).toHaveBeenNthCalledWith(2, { connectionString: process.env.DATABASE_URL });
  });

  it('keeps a configured RLS role and its separate password', async () => {
    const appUrl = 'postgres://openpartner_app:separate_fixture_password@localhost:55433/openpartner_test';
    vi.stubEnv('DATABASE_URL_APP', appUrl);
    await import('../db.js');
    expect(createDb).toHaveBeenNthCalledWith(2, { connectionString: appUrl });
  });

  it('inherits migration SSL mode without changing the application credentials', async () => {
    const appUrl = 'postgres://openpartner_app:separate_fixture_password@localhost:55433/openpartner_test';
    vi.stubEnv('DATABASE_URL', `${process.env.DATABASE_URL}?sslmode=require`);
    vi.stubEnv('DATABASE_URL_APP', appUrl);
    await import('../db.js');
    expect(createDb).toHaveBeenNthCalledWith(2, { connectionString: `${appUrl}?sslmode=require` });
  });
});
