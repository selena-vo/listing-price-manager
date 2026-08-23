// GET /api/health — docs/api.md.
export async function GET() {
  return Response.json({
    ok: true,
    service: 'price-manager-api',
    version: '0.1.0',
  });
}
