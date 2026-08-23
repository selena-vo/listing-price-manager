import { db } from '@/lib/db/drizzle';
import { platforms, homestays, listingPrices, campaigns } from '@/lib/db/schema';

// GET /api/dashboard — one call returns the whole board (docs/api.md).
// Returns raw values only; guest price / net are computed client-side with lib/pricing/rule-engine.
export async function GET() {
  const [platformRows, homestayRows, priceRows, campaignRows] = await Promise.all([
    db.select().from(platforms).orderBy(platforms.sortOrder, platforms.id),
    db.select().from(homestays).orderBy(homestays.id),
    db.select().from(listingPrices),
    db.select().from(campaigns),
  ]);

  const campaignsByPlatform = new Map<number, (typeof campaignRows)[number][]>();
  for (const c of campaignRows) {
    const list = campaignsByPlatform.get(c.platformId) ?? [];
    list.push(c);
    campaignsByPlatform.set(c.platformId, list);
  }

  const pricesByHomestay = new Map<number, (typeof priceRows)[number][]>();
  for (const p of priceRows) {
    const list = pricesByHomestay.get(p.homestayId) ?? [];
    list.push(p);
    pricesByHomestay.set(p.homestayId, list);
  }

  return Response.json({
    platforms: platformRows.map((p) => ({
      ...p,
      campaigns: campaignsByPlatform.get(p.id) ?? [],
    })),
    homestays: homestayRows.map((h) => ({
      ...h,
      prices: pricesByHomestay.get(h.id) ?? [],
    })),
  });
}
