import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { listingPrices } from '@/lib/db/schema';
import { errorResponse, parseId } from '@/lib/api/helpers';

type Ctx = { params: Promise<{ listingId: string; platformId: string }> };

// PUT /api/listings/:listingId/platforms/:platformId/price — upsert (SPEC §6, docs/api.md).
export async function PUT(req: Request, ctx: Ctx) {
  const { listingId: rawH, platformId: rawP } = await ctx.params;
  const listingId = parseId(rawH);
  const platformId = parseId(rawP);
  if (!listingId || !platformId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'invalid listingId or platformId');
  }

  const body = await req.json().catch(() => null);
  if (!body || !Number.isInteger(body.pricePerNight) || body.pricePerNight <= 0) {
    return errorResponse(400, 'VALIDATION_ERROR', 'pricePerNight must be an integer > 0');
  }

  const note = typeof body.note === 'string' && body.note.trim() !== '' ? body.note.trim() : null;

  const [existing] = await db
    .select({ id: listingPrices.id })
    .from(listingPrices)
    .where(and(eq(listingPrices.listingId, listingId), eq(listingPrices.platformId, platformId)))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(listingPrices)
      .set({ pricePerNight: body.pricePerNight, note, updatedAt: new Date() })
      .where(eq(listingPrices.id, existing.id))
      .returning();
    return Response.json(row, { status: 200 });
  }

  const [row] = await db
    .insert(listingPrices)
    .values({
      listingId,
      platformId,
      pricePerNight: body.pricePerNight,
      currency: 'VND',
      note,
    })
    .returning();
  return Response.json(row, { status: 201 });
}

// GET /api/listings/:listingId/platforms/:platformId/price
export async function GET(_req: Request, ctx: Ctx) {
  const { listingId: rawH, platformId: rawP } = await ctx.params;
  const listingId = parseId(rawH);
  const platformId = parseId(rawP);
  if (!listingId || !platformId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'invalid listingId or platformId');
  }

  const [row] = await db
    .select()
    .from(listingPrices)
    .where(and(eq(listingPrices.listingId, listingId), eq(listingPrices.platformId, platformId)))
    .limit(1);

  if (!row) return errorResponse(404, 'NOT_FOUND', 'price not set');
  return Response.json(row);
}
