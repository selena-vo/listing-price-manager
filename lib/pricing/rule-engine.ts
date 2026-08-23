// Discount rule engine — SPEC §4 "Pricing math (contract)".
// Used by both the S2 live preview and the S1 dashboard, so they can never disagree (SPEC §6).
// Rule semantics:
//   sum        — d₁ + d₂ + … capped at 100%            (Trip.com stacking per config)
//   best       — max(d₁, d₂, …)                         (Booking non-combinable)
//   priority   — single winner: lowest priorityOrder    (Airbnb "priority over stacking")
//   sequential — applied in priority order, each on the running price (Booking combinable)

import type { Campaign, DiscountRule } from './index';

export interface PriceInput {
  listedPrice: number; // VND, > 0
  commissionRate: number; // %, 0–100
  rule: DiscountRule;
  campaigns: Array<
    Pick<Campaign, 'id' | 'discountPercent' | 'priorityOrder' | 'active'> & {
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
    }
  >;
  now?: Date;
}

export interface PriceBreakdown {
  totalDiscount: number; // % (effective percentage for `sequential`)
  guestPrice: number;
  commission: number;
  net: number;
  winningCampaignId: number | null; // set only for `priority` (single winner)
}

// Normalize to start-of-day so a campaign's date window is matched by CALENDAR day,
// not by the exact timestamp (avoids timezone drift when computing past/future days).
function startOfDay(input: string | Date | null): number {
  if (!input) return Number.NaN;
  const d = new Date(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isActive(
  c: PriceInput['campaigns'][number],
  now: Date,
): boolean {
  if (!c.active) return false;
  const day = startOfDay(now);
  const s = c.startsAt ? startOfDay(c.startsAt) : Number.NEGATIVE_INFINITY;
  const e = c.endsAt ? startOfDay(c.endsAt) : Number.POSITIVE_INFINITY;
  return day >= s && day <= e;
}

export function computePrice({
  listedPrice,
  commissionRate,
  rule,
  campaigns,
  now = new Date(),
}: PriceInput): PriceBreakdown {
  if (!Number.isFinite(listedPrice) || listedPrice <= 0) {
    throw new Error('listedPrice must be a positive number');
  }
  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error('commissionRate must be between 0 and 100');
  }

  const active = campaigns
    .filter((c) => isActive(c, now))
    .sort(
      (a, b) =>
        (a.priorityOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.priorityOrder ?? Number.MAX_SAFE_INTEGER) || a.id - b.id,
    );

  let totalDiscount: number;
  let guestPrice: number;
  let winningCampaignId: number | null = null;

  switch (rule) {
    case 'sum':
      totalDiscount = Math.min(100, active.reduce((s, c) => s + c.discountPercent, 0));
      guestPrice = listedPrice * (1 - totalDiscount / 100);
      break;
    case 'best':
      totalDiscount = active.reduce((m, c) => Math.max(m, c.discountPercent), 0);
      guestPrice = listedPrice * (1 - totalDiscount / 100);
      break;
    case 'priority': {
      const winner = active[0];
      if (winner) {
        totalDiscount = winner.discountPercent;
        guestPrice = listedPrice * (1 - totalDiscount / 100);
        winningCampaignId = winner.id;
      } else {
        totalDiscount = 0;
        guestPrice = listedPrice;
      }
      break;
    }
    case 'sequential': {
      guestPrice = active.reduce((p, c) => p * (1 - c.discountPercent / 100), listedPrice);
      totalDiscount = (1 - guestPrice / listedPrice) * 100;
      break;
    }
    default:
      throw new Error(`Unknown discount rule: ${String(rule)}`);
  }

  const commission = (guestPrice * commissionRate) / 100;
  const net = guestPrice - commission;

  return { totalDiscount, guestPrice, commission, net, winningCampaignId };
}
