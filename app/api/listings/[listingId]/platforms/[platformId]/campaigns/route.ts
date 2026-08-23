import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { platforms, listings, campaigns } from '@/lib/db/schema';
import { CAMPAIGN_TYPES, type CampaignType } from '@/lib/pricing';
import { errorResponse, parseId } from '@/lib/api/helpers';

type Ctx = { params: Promise<{ listingId: string; platformId: string }> };

// POST /api/listings/:listingId/platforms/:platformId/campaigns — create a listing's campaign.
export async function POST(req: Request, ctx: Ctx) {
  const { listingId: rawL, platformId: rawP } = await ctx.params;
  const listingId = parseId(rawL);
  const platformId = parseId(rawP);
  if (!listingId || !platformId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'invalid listingId or platformId');
  }

  const [listing] = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, listingId)).limit(1);
  const [platform] = await db.select({ id: platforms.id }).from(platforms).where(eq(platforms.id, platformId)).limit(1);
  if (!listing) return errorResponse(404, 'NOT_FOUND', 'listing not found');
  if (!platform) return errorResponse(404, 'NOT_FOUND', 'platform not found');

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return errorResponse(400, 'VALIDATION_ERROR', 'name is required');
  }
  if (typeof body.discountPercent !== 'number' || body.discountPercent < 0 || body.discountPercent > 100) {
    return errorResponse(400, 'VALIDATION_ERROR', 'discountPercent must be between 0 and 100');
  }
  if (body.priorityOrder !== undefined && body.priorityOrder !== null) {
    if (!Number.isInteger(body.priorityOrder) || body.priorityOrder < 1) {
      return errorResponse(400, 'VALIDATION_ERROR', 'priorityOrder must be an integer >= 1');
    }
  }
  if (body.type !== undefined && body.type !== null && !CAMPAIGN_TYPES.includes(body.type as CampaignType)) {
    return errorResponse(400, 'VALIDATION_ERROR', `type must be one of: ${CAMPAIGN_TYPES.join(', ')}`);
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if ((body.startsAt && Number.isNaN(startsAt?.getTime())) || (body.endsAt && Number.isNaN(endsAt?.getTime()))) {
    return errorResponse(400, 'VALIDATION_ERROR', 'startsAt/endsAt must be valid ISO dates');
  }

  const [row] = await db
    .insert(campaigns)
    .values({
      listingId,
      platformId,
      name: body.name.trim(),
      discountPercent: body.discountPercent,
      active: body.active === true,
      priorityOrder: body.priorityOrder ?? null,
      type: body.type ?? null,
      startsAt,
      endsAt,
    })
    .returning();

  return Response.json(row, { status: 201 });
}
