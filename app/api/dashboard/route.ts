import { db } from '@/lib/db/drizzle';
import { platforms, listings, listingPrices, campaigns } from '@/lib/db/schema';

// GET /api/dashboard — one call returns the whole board (docs/api.md).
// Returns raw values only; guest price / net are computed client-side with lib/pricing/rule-engine.
export async function GET() {
  const [platformRows, listingRows, priceRows, campaignRows] = await Promise.all([
    db.select().from(platforms).orderBy(platforms.sortOrder, platforms.id),
    db.select().from(listings).orderBy(listings.id),
    db.select().from(listingPrices),
    db.select().from(campaigns),
  ]);

  const campaignsByPlatform = new Map<number, (typeof campaignRows)[number][]>();
  for (const c of campaignRows) {
    const list = campaignsByPlatform.get(c.platformId) ?? [];
    list.push(c);
    campaignsByPlatform.set(c.platformId, list);
  }

  const pricesByListing = new Map<number, (typeof priceRows)[number][]>();
  for (const p of priceRows) {
    const list = pricesByListing.get(p.listingId) ?? [];
    list.push(p);
    pricesByListing.set(p.listingId, list);
  }

  return Response.json({
    platforms: platformRows.map((p) => ({
      ...p,
      campaigns: campaignsByPlatform.get(p.id) ?? [],
    })),
    listings: listingRows.map((h) => ({
      ...h,
      prices: pricesByListing.get(h.id) ?? [],
    })),
  });
}
