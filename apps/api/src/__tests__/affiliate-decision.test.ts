import { afterEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { readAffiliateDecision } from '../affiliate-decision.js';

afterEach(() => { delete process.env.AFFILIATE_DECISION_SECRET; });
describe('affiliate decision trust boundary', () => {
  it('preserves legacy events without a decision', () => { expect(readAffiliateDecision({}, 'tenant')).toBeNull(); });
  it('requires a configured strong key for marked events', () => {
    expect(() => readAffiliateDecision({ affiliate_decision: '{}' }, 'tenant')).toThrow('invalid_affiliate_decision');
  });
  it('binds the proof to the tenant and application identity', () => {
    const secret = process.env.AFFILIATE_DECISION_SECRET = 'fixture_secret_0123456789abcdef01234567';
    const affiliate_decision = JSON.stringify({ v: 1, tenantId: 'tenant', userId: 'user', scope: 'checkout', winner: 'awin', clickId: null, ts: Date.now() });
    const metadata = { affiliate_decision, affiliate_signature: createHmac('sha256', secret).update(affiliate_decision).digest('hex') };
    expect(readAffiliateDecision(metadata, 'tenant', 'user')?.winner).toBe('awin');
    expect(() => readAffiliateDecision(metadata, 'other', 'user')).toThrow();
    expect(() => readAffiliateDecision(metadata, 'tenant', 'other')).toThrow();
    expect(() => readAffiliateDecision({ ...metadata, affiliate_signature: '0'.repeat(64) }, 'tenant', 'user')).toThrow();
  });
});
