import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { campaigns } from '@/lib/db/schema';
import { CAMPAIGN_TYPES, type CampaignType } from '@/lib/pricing';
import { errorResponse, parseId } from '@/lib/api/helpers';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/campaigns/:id — update any subset: name, discountPercent, active, priorityOrder, type, dates.
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const campaignId = parseId(id);
  if (!campaignId) return errorResponse(400, 'VALIDATION_ERROR', 'invalid campaign id');

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'VALIDATION_ERROR', 'invalid body');
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'name must be a non-empty string');
    }
    updates.name = body.name.trim();
  }
  if (body.discountPercent !== undefined) {
    if (typeof body.discountPercent !== 'number' || body.discountPercent < 0 || body.discountPercent > 100) {
      return errorResponse(400, 'VALIDATION_ERROR', 'discountPercent must be between 0 and 100');
    }
    updates.discountPercent = body.discountPercent;
  }
  if (body.active !== undefined) {
    updates.active = body.active === true;
  }
  if (body.priorityOrder !== undefined) {
    if (body.priorityOrder !== null && (!Number.isInteger(body.priorityOrder) || body.priorityOrder < 1)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'priorityOrder must be an integer >= 1 or null');
    }
    updates.priorityOrder = body.priorityOrder;
  }
  if (body.type !== undefined) {
    if (body.type !== null && !CAMPAIGN_TYPES.includes(body.type as CampaignType)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        `type must be one of: ${CAMPAIGN_TYPES.join(', ')}`,
      );
    }
    updates.type = body.type;
  }
  if (body.startsAt !== undefined) {
    updates.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  }
  if (body.endsAt !== undefined) {
    updates.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, 'VALIDATION_ERROR', 'no updatable fields provided');
  }

  const [row] = await db
    .update(campaigns)
    .set(updates)
    .where(eq(campaigns.id, campaignId))
    .returning();
  if (!row) return errorResponse(404, 'NOT_FOUND', 'campaign not found');
  return Response.json(row);
}

// DELETE /api/campaigns/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const campaignId = parseId(id);
  if (!campaignId) return errorResponse(400, 'VALIDATION_ERROR', 'invalid campaign id');

  await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  return new Response(null, { status: 204 });
}
