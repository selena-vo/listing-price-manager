import { db } from '@/lib/db/drizzle';
import { homestays } from '@/lib/db/schema';
import { errorResponse } from '@/lib/api/helpers';

// GET /api/homestays — list homestays (docs/api.md; optional ?include=prices is not needed — use /api/dashboard).
export async function GET() {
  const rows = await db.select().from(homestays).orderBy(homestays.id);
  return Response.json(rows);
}

// POST /api/homestays — create a homestay (SPEC §5).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    return errorResponse(400, 'VALIDATION_ERROR', 'name is required');
  }

  const [row] = await db
    .insert(homestays)
    .values({
      name: body.name.trim(),
      location: typeof body.location === 'string' && body.location.trim() !== '' ? body.location.trim() : null,
      notes: typeof body.notes === 'string' && body.notes.trim() !== '' ? body.notes.trim() : null,
    })
    .returning();

  return Response.json(row, { status: 201 });
}
