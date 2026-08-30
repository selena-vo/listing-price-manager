// Domain types + platform presets — SPEC.md (v1.0) §4/§5.
// Single source of truth for the product's data shapes.

export type DiscountRule = 'sum' | 'best' | 'priority' | 'sequential';

export const DISCOUNT_RULES: readonly DiscountRule[] = ['sum', 'best', 'priority', 'sequential'];

export type CampaignType =
  | 'new_listing'
  | 'custom'
  | 'length_of_stay'
  | 'early_bird'
  | 'last_minute'
  | 'other';

export const CAMPAIGN_TYPES: readonly CampaignType[] = [
  'new_listing',
  'custom',
  'length_of_stay',
  'early_bird',
  'last_minute',
  'other',
];

/**
 * Per-platform net deduction (thực nhận) config — overrides the simple commission % when set.
 * Airbnb example (PO formula): Phí Host 15.5% × 1.10 (VAT on fee), Thuế VAT 5%, Thuế TNCN 2%
 * → net = S × (1 − 0.1705 − 0.05 − 0.02) = S × 0.7595.
 */
export type Deduction =
  | { kind: 'percentOfS'; label: string; rate: number } // deducts S × rate/100
  | { kind: 'percentOfSWithVat'; label: string; rate: number; vatRate: number }; // deducts S × rate/100 × (1 + vatRate/100)

export interface Platform {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
  commissionRate: number; // %, 0–100
  discountRule: DiscountRule;
  netDeductions: Deduction[] | null; // when set, net uses these instead of commissionRate
  createdAt: string;
}

export interface Listing {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ListingPrice {
  id: number;
  listingId: number;
  platformId: number;
  pricePerNight: number; // VND, integer > 0 (SPEC §9 Q4)
  currency: string; // 'VND' for MVP
  note: string | null;
  updatedAt: string;
}

export interface Campaign {
  id: number;
  platformId: number;
  name: string;
  discountPercent: number; // 0–100
  active: boolean;
  priorityOrder: number | null; // 1 = highest; used by `priority` / `sequential` rules
  type: CampaignType | null; // metadata only — seeds Airbnb priority numbers (SPEC §5)
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

// --- Platform presets (SPEC §4 "Reference: real platform rules", PO-provided Aug 23, 2026) ---

export interface PlatformPreset {
  key: 'airbnb' | 'booking' | 'trip';
  name: string;
  color: string;
  commissionRate: number; // %, editable in S4; spec default 15
  discountRule: DiscountRule;
  /** Airbnb only: fixed priority ranking of campaign types (New Listing > Custom > LOS > Early-Bird > Last-Minute). */
  campaignTypeOrder?: readonly CampaignType[];
  /** Airbnb: net = S × (1 − 0.1705 − 0.05 − 0.02) = S × 0.7595 (PO formula). */
  netDeductions?: readonly Deduction[];
}

export const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  {
    key: 'airbnb',
    name: 'Airbnb',
    color: '#FF5A5F',
    commissionRate: 3,
    discountRule: 'priority',
    campaignTypeOrder: ['new_listing', 'custom', 'length_of_stay', 'early_bird', 'last_minute'],
    netDeductions: [
      { kind: 'percentOfSWithVat', label: 'Phí Host', rate: 15.5, vatRate: 10 },
      { kind: 'percentOfS', label: 'Thuế VAT', rate: 5 },
      { kind: 'percentOfS', label: 'Thuế TNCN', rate: 2 },
    ],
  },
  {
    key: 'booking',
    name: 'Booking.com',
    color: '#003580',
    commissionRate: 15,
    discountRule: 'sequential',
  },
  {
    key: 'trip',
    name: 'Trip.com',
    color: '#0066CC',
    commissionRate: 10,
    discountRule: 'sum',
  },
];

export { computePrice, effectiveDeductionRate } from './rule-engine';
export type { PriceInput, PriceBreakdown, DeductionItem } from './rule-engine';
