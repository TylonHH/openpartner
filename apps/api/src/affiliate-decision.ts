import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AffiliateDecision {
  v: 1;
  tenantId: string;
  userId: string;
  scope: string;
  winner: 'awin' | 'openpartner' | 'none';
  clickId: string | null;
  ts: number;
}

/** Server-signed purchase decision. Never infer a winner from customer metadata. */
export function readAffiliateDecision(
  metadata: Record<string, unknown> | null | undefined,
  tenantId: string,
  userId?: string,
): AffiliateDecision | null {
  const payload = metadata?.affiliate_decision;
  const signature = metadata?.affiliate_signature;
  if (payload == null && signature == null) return null;
  const secret = process.env.AFFILIATE_DECISION_SECRET;
  if (!secret || secret.length < 32 || typeof payload !== 'string' || typeof signature !== 'string' ||
      payload.length > 500 || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new Error('invalid_affiliate_decision');
  }
  const expected = createHmac('sha256', secret).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new Error('invalid_affiliate_decision');
  let decision: AffiliateDecision;
  try { decision = JSON.parse(payload) as AffiliateDecision; } catch { throw new Error('invalid_affiliate_decision'); }
  if (decision.v !== 1 || decision.tenantId !== tenantId || (userId && decision.userId !== userId) ||
      typeof decision.userId !== 'string' || !decision.userId || typeof decision.scope !== 'string' || !decision.scope ||
      !['awin', 'openpartner', 'none'].includes(decision.winner) || !Number.isSafeInteger(decision.ts) || decision.ts <= 0 ||
      (decision.winner === 'openpartner' ? typeof decision.clickId !== 'string' || !decision.clickId : decision.clickId !== null)) {
    throw new Error('invalid_affiliate_decision');
  }
  return decision;
}
