import { describe, expect, it } from 'vitest';
import { computePrice } from './rule-engine';
import type { PriceInput } from './rule-engine';

function makeCampaigns(
  defs: Array<{ pct: number; priority?: number; active?: boolean; id?: number }>,
): PriceInput['campaigns'] {
  return defs.map((d, i) => ({
    id: d.id ?? i + 1,
    discountPercent: d.pct,
    priorityOrder: d.priority ?? null,
    active: d.active ?? true,
    startsAt: null,
    endsAt: null,
  }));
}

describe('computePrice', () => {
  it('sum: adds discounts (Trip.com stacking per config)', () => {
    const r = computePrice({
      listedPrice: 1_000_000,
      commissionRate: 15,
      rule: 'sum',
      campaigns: makeCampaigns([{ pct: 10 }, { pct: 5 }]),
    });
    expect(r.totalDiscount).toBe(15);
    expect(r.guestPrice).toBe(850_000);
    expect(r.commission).toBe(127_500);
    expect(r.net).toBe(722_500);
  });

  it('sum: caps at 100%', () => {
    const r = computePrice({
      listedPrice: 100_000,
      commissionRate: 15,
      rule: 'sum',
      campaigns: makeCampaigns([{ pct: 60 }, { pct: 60 }]),
    });
    expect(r.totalDiscount).toBe(100);
    expect(r.guestPrice).toBe(0);
  });

  it('best: only the largest discount applies (Booking non-combinable)', () => {
    const r = computePrice({
      listedPrice: 1_000_000,
      commissionRate: 15,
      rule: 'best',
      campaigns: makeCampaigns([{ pct: 5 }, { pct: 20 }]),
    });
    expect(r.totalDiscount).toBe(20);
    expect(r.guestPrice).toBe(800_000);
  });

  it('priority: single winner by priority order (Airbnb model)', () => {
    const r = computePrice({
      listedPrice: 1_000_000,
      commissionRate: 15,
      rule: 'priority',
      campaigns: makeCampaigns([
        { pct: 5, priority: 3 },
        { pct: 20, priority: 1 },
        { pct: 10, priority: 2 },
      ]),
    });
    expect(r.winningCampaignId).toBe(2); // pct 20, priority 1 → wins
    expect(r.totalDiscount).toBe(20);
    expect(r.guestPrice).toBe(800_000);
  });

  it('priority: no active campaigns → no discount', () => {
    const r = computePrice({ listedPrice: 1_000_000, commissionRate: 15, rule: 'priority', campaigns: [] });
    expect(r.totalDiscount).toBe(0);
    expect(r.winningCampaignId).toBeNull();
    expect(r.guestPrice).toBe(1_000_000);
    expect(r.net).toBe(850_000);
  });

  it('sequential: applies in priority order on the running price (Booking combinable)', () => {
    const r = computePrice({
      listedPrice: 1_000_000,
      commissionRate: 15,
      rule: 'sequential',
      campaigns: makeCampaigns([
        { pct: 10, priority: 2 },
        { pct: 20, priority: 1 },
      ]),
    });
    // 1_000_000 × 0.80 × 0.90 = 720_000
    expect(r.guestPrice).toBe(720_000);
    expect(r.totalDiscount).toBeCloseTo(28, 5);
  });

  it('ignores inactive and out-of-window campaigns', () => {
    const r = computePrice({
      listedPrice: 1_000_000,
      commissionRate: 15,
      rule: 'sum',
      campaigns: [
        { id: 1, discountPercent: 10, priorityOrder: null, active: false, startsAt: null, endsAt: null },
        { id: 2, discountPercent: 20, priorityOrder: null, active: true, startsAt: '2027-01-01T00:00:00.000Z', endsAt: null },
        { id: 3, discountPercent: 30, priorityOrder: null, active: true, startsAt: null, endsAt: '2020-01-01T00:00:00.000Z' },
      ],
      now: new Date('2026-08-23T12:00:00.000Z'),
    });
    expect(r.totalDiscount).toBe(0);
    expect(r.guestPrice).toBe(1_000_000);
  });

  it('rejects invalid input', () => {
    expect(() => computePrice({ listedPrice: 0, commissionRate: 15, rule: 'sum', campaigns: [] })).toThrow();
    expect(() =>
      computePrice({ listedPrice: 1_000_000, commissionRate: 101, rule: 'sum', campaigns: [] }),
    ).toThrow();
  });
});
