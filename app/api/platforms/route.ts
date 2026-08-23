import { db } from '@/lib/db/drizzle';
import { platforms } from '@/lib/db/schema';
import { DISCOUNT_RULES, type DiscountRule } from '@/lib/pricing';
import { errorResponse } from '@/lib/api/helpers';

// GET /api/platforms — list platforms (SPEC §6).
export async function GET() {
  const rows = await db.select().from(platforms).orderBy(platforms.sortOrder, platforms.id);
  return Response.json(rows);
}

// POST /api/platforms — create a platform. Defaults: commissionRate 15, discountRule 'sum'.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return errorResponse(400, 'VALIDATION_ERROR', 'name is required');
  }

  const commissionRate = body.commissionRate ?? 15;
  if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
    return errorResponse(400, 'VALIDATION_ERROR', 'commissionRate must be between 0 and 100');
  }

  const discountRule: DiscountRule = body.discountRule ?? 'sum';
  if (!DISCOUNT_RULES.includes(discountRule)) {
    return errorResponse(
      400,
      'VALIDATION_ERROR',
      `discountRule must be one of: ${DISCOUNT_RULES.join(', ')}`,
    );
  }

  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;
  const color = typeof body.color === 'string' && body.color.trim() !== '' ? body.color : null;

  try {
    const [row] = await db
      .insert(platforms)
      .values({ name: body.name.trim(), color, sortOrder, commissionRate, discountRule })
      .returning();
    return Response.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return errorResponse(409, 'CONFLICT', 'A platform with this name already exists');
    }
    throw error;
  }
}
