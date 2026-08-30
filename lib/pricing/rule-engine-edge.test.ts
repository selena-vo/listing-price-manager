import { describe, expect, it } from 'vitest';
import { computePrice, effectiveDeductionRate } from './rule-engine';
import type { PriceInput } from './rule-engine';

function camp(
  id: number,
  pct: number,
  opts: { priority?: number | null; active?: boolean; startsAt?: string | null; endsAt?: string | null } = {},
): PriceInput['campaigns'][number] {
  return {
    id,
    discountPercent: pct,
    priorityOrder: opts.priority ?? null,
    active: opts.active ?? true,
    startsAt: opts.startsAt ?? null,
    endsAt: opts.endsAt ?? null,
  };
}

describe('computePrice edge cases', () => {
  it('sum: caps total discount at 100% → guest price 0, net 0', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 10, rule: 'sum', campaigns: [camp(1, 60), camp(2, 60)] });
    expect(r.totalDiscount).toBe(100);
    expect(r.guestPrice).toBe(0);
    expect(r.commission).toBe(0);
    expect(r.net).toBe(0);
  });

  it('priority: tie on priorityOrder → lowest campaign id wins', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [camp(1, 10, { priority: 1 }), camp(2, 20, { priority: 1 })] });
    expect(r.winningCampaignId).toBe(1);
    expect(r.totalDiscount).toBe(10);
  });

  it('priority: only inactive campaigns → base price, no winner', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [camp(1, 10, { active: false })] });
    expect(r.totalDiscount).toBe(0);
    expect(r.winningCampaignId).toBeNull();
    expect(r.guestPrice).toBe(500000);
  });

  it('best: no campaigns → base price', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 15, rule: 'best', campaigns: [] });
    expect(r.guestPrice).toBe(500000);
    expect(r.net).toBe(425000);
  });

  it('sequential: 100% discount → guest price 0', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 15, rule: 'sequential', campaigns: [camp(1, 100)] });
    expect(r.guestPrice).toBe(0);
  });

  it('campaign with only startsAt is active from that day onward (no end)', () => {
    const c = camp(1, 10, { startsAt: '2026-08-05', endsAt: null });
    const after = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [c], now: new Date('2026-08-07T12:00:00Z') });
    const before = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [c], now: new Date('2026-08-03T12:00:00Z') });
    expect(after.totalDiscount).toBe(10);
    expect(before.totalDiscount).toBe(0);
  });

  it('campaign with only endsAt is active until that day (no start)', () => {
    const c = camp(1, 10, { startsAt: null, endsAt: '2026-08-09' });
    const within = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [c], now: new Date('2026-08-07T12:00:00Z') });
    const past = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [c], now: new Date('2026-08-12T12:00:00Z') });
    expect(within.totalDiscount).toBe(10);
    expect(past.totalDiscount).toBe(0);
  });

  it('campaign is active on its exact start day (date-only boundary)', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 3, rule: 'priority', campaigns: [camp(1, 10, { startsAt: '2026-08-05', endsAt: '2026-08-09' })], now: new Date('2026-08-05T00:00:00Z') });
    expect(r.totalDiscount).toBe(10);
  });

  it('commission 0% → net = guest price; 100% → net 0', () => {
    const r0 = computePrice({ listedPrice: 500000, commissionRate: 0, rule: 'sum', campaigns: [] });
    expect(r0.net).toBe(500000);
    const r100 = computePrice({ listedPrice: 500000, commissionRate: 100, rule: 'sum', campaigns: [] });
    expect(r100.net).toBe(0);
  });

  it('sequential: order matters (10% then 10% ≠ 20%)', () => {
    const r = computePrice({ listedPrice: 100000, commissionRate: 0, rule: 'sequential', campaigns: [camp(1, 10, { priority: 1 }), camp(2, 10, { priority: 2 })] });
    expect(r.guestPrice).toBeCloseTo(81000, 5); // 100000 × 0.9 × 0.9
  });
});

describe('per-platform net deductions (Airbnb formula)', () => {
  const AIRBNB = [
    { kind: 'percentOfSWithVat', label: 'Phí Host', rate: 15.5, vatRate: 10 },
    { kind: 'percentOfS', label: 'Thuế VAT', rate: 5 },
    { kind: 'percentOfS', label: 'Thuế TNCN', rate: 2 },
  ] as const;

  it('effective rate = 24.05% (15.5×1.10 + 5 + 2)', () => {
    expect(effectiveDeductionRate(AIRBNB as unknown as PriceInput['deductions'])).toBeCloseTo(24.05, 5);
  });

  it('promo day: S = 450000 → net = 341775 (= 450000 × 0.7595)', () => {
    const r = computePrice({
      listedPrice: 500000,
      commissionRate: 3,
      rule: 'priority',
      campaigns: [camp(1, 10, { priority: 1 })],
      deductions: AIRBNB as unknown as PriceInput['deductions'],
    });
    expect(r.guestPrice).toBe(450000);
    expect(r.effectiveRate).toBeCloseTo(24.05, 5);
    expect(r.deductionItems).toHaveLength(3);
    expect(r.deductionItems[0]?.amount).toBeCloseTo(76725, 5); // 450000 × 0.155 × 1.10
    expect(r.deductionItems[1]?.amount).toBe(22500); // VAT 5%
    expect(r.deductionItems[2]?.amount).toBe(9000); // TNCN 2%
    expect(r.commission).toBeCloseTo(108225, 5);
    expect(r.net).toBeCloseTo(341775, 5);
  });

  it('no promo: S = 500000 → net = 379750 (= 500000 × 0.7595)', () => {
    const r = computePrice({
      listedPrice: 500000,
      commissionRate: 3,
      rule: 'priority',
      campaigns: [],
      deductions: AIRBNB as unknown as PriceInput['deductions'],
    });
    expect(r.net).toBeCloseTo(379750, 5);
  });

  it('without deductions falls back to simple commission %', () => {
    const r = computePrice({ listedPrice: 500000, commissionRate: 15, rule: 'priority', campaigns: [] });
    expect(r.effectiveRate).toBe(15);
    expect(r.deductionItems).toHaveLength(1);
    expect(r.deductionItems[0]?.label).toBe('Phí hoa hồng');
    expect(r.net).toBe(425000);
  });
});
