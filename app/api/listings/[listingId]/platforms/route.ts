import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { platforms, listings, listingPlatforms } from '@/lib/db/schema';
import { errorResponse, parseId } from '@/lib/api/helpers';

type Ctx = { params: Promise<{ listingId: string }> };

// PUT /api/listings/:listingId/platforms — set which platforms this listing uses (SPEC §5).
// Body: { platformIds: number[] }. Replaces the listing's current platform set.
export async function PUT(req: Request, ctx: Ctx) {
  const { listingId: raw } = await ctx.params;
  const id = parseId(raw);
  if (!id) return errorResponse(400, 'VALIDATION_ERROR', 'invalid listing id');

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.platformIds)) {
    return errorResponse(400, 'VALIDATION_ERROR', 'platformIds must be an array');
  }

  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!listing) return errorResponse(404, 'NOT_FOUND', 'listing not found');

  const ids = body.platformIds
    .filter((x: unknown): x is number => Number.isInteger(x))
    .map(Number);

  const platformRows = ids.length
    ? await db.select({ id: platforms.id }).from(platforms).where(inArray(platforms.id, ids))
    : [];
  const validIds = platformRows.map((p) => p.id);

  await db.transaction(async (tx) => {
    await tx.delete(listingPlatforms).where(eq(listingPlatforms.listingId, id));
    if (validIds.length) {
      await tx.insert(listingPlatforms).values(validIds.map((pid) => ({ listingId: id, platformId: pid })));
    }
  });

  return Response.json({ platformIds: validIds });
}
