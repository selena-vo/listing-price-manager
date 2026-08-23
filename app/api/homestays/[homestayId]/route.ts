import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { homestays } from '@/lib/db/schema';
import { errorResponse, parseId } from '@/lib/api/helpers';

type Ctx = { params: Promise<{ homestayId: string }> };

// PATCH /api/homestays/:id — update name, location, notes.
export async function PATCH(req: Request, ctx: Ctx) {
  const { homestayId: rawId } = await ctx.params;
  const homestayId = parseId(rawId);
  if (!homestayId) return errorResponse(400, 'VALIDATION_ERROR', 'invalid homestay id');

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
  if (body.location !== undefined) {
    updates.location = typeof body.location === 'string' && body.location.trim() !== '' ? body.location.trim() : null;
  }
  if (body.notes !== undefined) {
    updates.notes = typeof body.notes === 'string' && body.notes.trim() !== '' ? body.notes.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, 'VALIDATION_ERROR', 'no updatable fields provided');
  }

  const [row] = await db
    .update(homestays)
    .set(updates)
    .where(eq(homestays.id, homestayId))
    .returning();
  if (!row) return errorResponse(404, 'NOT_FOUND', 'homestay not found');
  return Response.json(row);
}

// DELETE /api/homestays/:id — cascades to its listing prices (FK onDelete).
export async function DELETE(_req: Request, ctx: Ctx) {
  const { homestayId: rawId } = await ctx.params;
  const homestayId = parseId(rawId);
  if (!homestayId) return errorResponse(400, 'VALIDATION_ERROR', 'invalid homestay id');

  await db.delete(homestays).where(eq(homestays.id, homestayId));
  return new Response(null, { status: 204 });
}
