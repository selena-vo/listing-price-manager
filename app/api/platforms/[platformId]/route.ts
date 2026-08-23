import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { platforms } from '@/lib/db/schema';
import { DISCOUNT_RULES, type DiscountRule } from '@/lib/pricing';
import { errorResponse, parseId } from '@/lib/api/helpers';

type Ctx = { params: Promise<{ platformId: string }> };

// PATCH /api/platforms/:id — update any subset: name, color, commissionRate, discountRule, sortOrder.
export async function PATCH(req: Request, ctx: Ctx) {
  const { platformId: rawId } = await ctx.params;
  const platformId = parseId(rawId);
  if (!platformId) return errorResponse(400, 'VALIDATION_ERROR', 'invalid platform id');

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
  if (body.color !== undefined) {
    updates.color = typeof body.color === 'string' && body.color.trim() !== '' ? body.color : null;
  }
  if (body.commissionRate !== undefined) {
    if (typeof body.commissionRate !== 'number' || body.commissionRate < 0 || body.commissionRate > 100) {
      return errorResponse(400, 'VALIDATION_ERROR', 'commissionRate must be between 0 and 100');
    }
    updates.commissionRate = body.commissionRate;
  }
  if (body.discountRule !== undefined) {
    if (!DISCOUNT_RULES.includes(body.discountRule as DiscountRule)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        `discountRule must be one of: ${DISCOUNT_RULES.join(', ')}`,
      );
    }
    updates.discountRule = body.discountRule;
  }
  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== 'number') {
      return errorResponse(400, 'VALIDATION_ERROR', 'sortOrder must be a number');
    }
    updates.sortOrder = body.sortOrder;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, 'VALIDATION_ERROR', 'no updatable fields provided');
  }

  try {
    const [row] = await db
      .update(platforms)
      .set(updates)
      .where(eq(platforms.id, platformId))
      .returning();
    if (!row) return errorResponse(404, 'NOT_FOUND', 'platform not found');
    return Response.json(row);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return errorResponse(409, 'CONFLICT', 'A platform with this name already exists');
    }
    throw error;
  }
}

// DELETE /api/platforms/:id — cascades to its campaigns and listing prices (FK onDelete).
export async function DELETE(_req: Request, ctx: Ctx) {
  const { platformId: rawId } = await ctx.params;
  const platformId = parseId(rawId);
  if (!platformId) return errorResponse(400, 'VALIDATION_ERROR', 'invalid platform id');

  await db.delete(platforms).where(eq(platforms.id, platformId));
  return new Response(null, { status: 204 });
}
