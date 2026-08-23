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

export interface Platform {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
  commissionRate: number; // %, 0–100
  discountRule: DiscountRule;
  createdAt: string;
}

export interface Homestay {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ListingPrice {
  id: number;
  homestayId: number;
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
}

export const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  {
    key: 'airbnb',
    name: 'Airbnb',
    color: '#FF5A5F',
    commissionRate: 15,
    discountRule: 'priority',
    campaignTypeOrder: ['new_listing', 'custom', 'length_of_stay', 'early_bird', 'last_minute'],
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
    commissionRate: 15,
    discountRule: 'sum',
  },
];
