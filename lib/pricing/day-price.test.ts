import { describe, expect, it } from 'vitest';
import { computePrice } from './rule-engine';
import type { PriceInput } from './rule-engine';

function camp(
  id: number,
  pct: number,
  opts: { priority?: number; active?: boolean; startsAt?: string | null; endsAt?: string | null } = {},
): PriceInput['campaigns'][number] {
  return { id, discountPercent: pct, priorityOrder: opts.priority ?? null, active: opts.active ?? true, startsAt: opts.startsAt ?? null, endsAt: opts.endsAt ?? null };
}

// SPEC v1.1 — day-board price logic, verified against the PO mockup.
describe('Day board price logic (SPEC v1.1)', () => {
  it('Airbnb priority + one −10% promo + 3% fee: 500k → 450k / 13.5k / 436.5k (mockup)', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [camp(1, 10, { priority: 1 })] });
    expect(r.totalDiscount).toBe(10);
    expect(r.guestPrice).toBe(450000);
    expect(r.commission).toBe(13500); // 3% of 450k (discounted), not of base
    expect(r.net).toBe(436500);
  });

  it('Booking sequential + two combinable discounts + 15% fee compound in priority order', () => {
    // 500k × 0.90 × 0.95 = 427500 (early-bird 10% then 5%)
    const r = computePrice({ listedPrice: 500000, commissionRate: 15, rule: 'sequential', campaigns: [camp(1, 10, { priority: 1 }), camp(2, 5, { priority: 2 })] });
    expect(r.guestPrice).toBe(427500);
    expect(r.commission).toBeCloseTo(64125, 2);
    expect(r.net).toBeCloseTo(363375, 2);
  });

  it('Trip sum + two stacked discounts + 10% fee: discounts add, cap 100%', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 10, rule: 'sum', campaigns: [camp(1, 10), camp(2, 5)] });
    expect(r.totalDiscount).toBe(15);
    expect(r.guestPrice).toBe(425000);
    expect(r.commission).toBe(42500);
    expect(r.net).toBe(382500);
  });

  it('Airbnb priority: only the highest-priority active campaign wins (New Listing > Custom > LOS > Early-Bird > Last-Minute)', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [camp(1, 5, { priority: 3 }), camp(2, 10, { priority: 1 }), camp(3, 7, { priority: 2 })] });
    expect(r.winningCampaignId).toBe(2);
    expect(r.totalDiscount).toBe(10);
    expect(r.guestPrice).toBe(450000);
  });

  it('Best: only the largest discount applies', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'best', campaigns: [camp(1, 5), camp(2, 20)] });
    expect(r.totalDiscount).toBe(20);
    expect(r.guestPrice).toBe(400000);
  });

  it('a campaign only affects dates inside its window (others keep the base price)', () => {
    const now = new Date('2026-08-07T12:00:00Z');
    const inWindow = [camp(1, 10, { startsAt: '2026-08-05', endsAt: '2026-08-09' })]; // covers Aug 7
    const outWindow = [camp(2, 10, { startsAt: '2026-09-01', endsAt: '2026-09-05' })]; // not Aug 7
    const r1 = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: inWindow, now });
    const r2 = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: outWindow, now });
    expect(r1.totalDiscount).toBe(10);
    expect(r2.totalDiscount).toBe(0);
    expect(r2.guestPrice).toBe(500000);
  });

  it('fee is always on the discounted (set) price, not the base', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'best', campaigns: [camp(1, 20)] });
    expect(r.guestPrice).toBe(400000);
    expect(r.commission).toBe(12000); // 3% of 400k
    expect(r.net).toBe(388000);
  });

  it('campaigns are matched per-platform rule — different platforms yield different day prices', () => {
    const campaigns = [camp(1, 10, { priority: 1 }), camp(2, 5, { priority: 2 })];
    const airbnb = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns });
    const booking = computePrice({ listedPrice: 500000, commissionRate: 15, rule: 'sequential', campaigns });
    const trip = computePrice({ listedPrice: 500000, commissionRate: 10, rule: 'sum', campaigns });
    // Airbnb priority → only −10%; Booking sequential → −14.5%; Trip sum → −15%
    expect(airbnb.guestPrice).toBe(450000);
    expect(booking.guestPrice).toBe(427500);
    expect(trip.guestPrice).toBe(425000);
  });
});
