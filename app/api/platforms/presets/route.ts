import { PLATFORM_PRESETS } from '@/lib/pricing';

// GET /api/platforms/presets — reference presets for the S4 preset picker (SPEC §4).
export async function GET() {
  return Response.json({ presets: PLATFORM_PRESETS });
}
