// API end-to-end smoke test — full flow against a RUNNING dev server (pnpm dev).
// Run: pnpm test:e2e   (BASE_URL env overrides http://localhost:3000)
import { computePrice } from '../lib/pricing/rule-engine';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const NAME = `E2E ${Date.now()}`;

let failures = 0;
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`, extra ?? '');
  }
}

async function j(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  console.log('API e2e smoke —', BASE);

  try {
    await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error('✗ Dev server không chạy. Chạy `pnpm dev` trước (hoặc set BASE_URL).');
    process.exit(1);
  }

  // 1. health
  const health = await j('/api/health');
  check('GET /api/health ok', health.res.ok && (health.body as any)?.ok === true);

  // 2. baseline dashboard
  const dash0 = await j('/api/dashboard');
  const platforms: any[] = (dash0.body as any)?.platforms ?? [];
  check('GET /api/dashboard returns platforms', platforms.length > 0);
  const airbnb = platforms.find((p: any) => p.name === 'Airbnb');

  // 3. create listing
  const created = await j('/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: NAME, location: 'E2E' }),
  });
  const listing: any = created.body;
  check('POST /api/listings creates listing', created.res.status === 201 && !!listing?.id);
  if (!listing?.id) {
    console.error('Dừng — không tạo được listing.');
    process.exit(1);
  }

  // 4. assign platforms
  const platformIds = platforms.map((p: any) => p.id);
  const assigned = await j(`/api/listings/${listing.id}/platforms`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platformIds }),
  });
  const assignedBody: any = assigned.body;
  check('PUT platforms assigns all', assignedBody?.platformIds?.length === platformIds.length);

  // 5. set base price on Airbnb (commission 3%)
  const price = await j(`/api/listings/${listing.id}/platforms/${airbnb.id}/price`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pricePerNight: 500000 }),
  });
  const priceBody: any = price.body;
  check('PUT price sets base 500000', [200, 201].includes(price.res.status) && priceBody?.pricePerNight === 500000);

  // 6. create a promo campaign (05–09 Aug)
  const campaign = await j(`/api/listings/${listing.id}/platforms/${airbnb.id}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E promo', discountPercent: 10, active: true, startsAt: '2026-08-05', endsAt: '2026-08-09' }),
  });
  const campaignBody: any = campaign.body;
  check('POST campaign on listing platform', campaign.res.status === 201 && !!campaignBody?.id);

  // 7. dashboard shows the new listing with price + campaign
  const dash1 = await j('/api/dashboard');
  const mine: any = (dash1.body as any)?.listings?.find((l: any) => l.id === listing.id);
  check('dashboard shows new listing', !!mine);
  check('listing platformIds set', mine?.platformIds?.includes(airbnb.id));
  check('listing price present', mine?.prices?.some((x: any) => x.platformId === airbnb.id && x.pricePerNight === 500000));
  const myCampaign = mine?.campaigns?.find((c: any) => c.id === campaignBody?.id);
  check('listing campaign present', !!myCampaign);

  // 8. day-board math for the promo day — Airbnb uses per-platform net deductions (15.5%×1.10 + 5% + 2% → 0.7595)
  if (mine && myCampaign) {
    const promo = mine.campaigns.filter((c: any) => c.platformId === airbnb.id);
    const promoDay = computePrice({ listedPrice: 500000, commissionRate: airbnb.commissionRate, rule: airbnb.discountRule, campaigns: promo, deductions: airbnb.netDeductions, now: new Date('2026-08-07T12:00:00Z') });
    check('promo day: set 450000', promoDay.guestPrice === 450000, promoDay);
    check('promo day: net 341775 (×0.7595)', Math.abs(promoDay.net - 341775) < 1, promoDay);
    const normalDay = computePrice({ listedPrice: 500000, commissionRate: airbnb.commissionRate, rule: airbnb.discountRule, campaigns: promo, deductions: airbnb.netDeductions, now: new Date('2026-08-12T12:00:00Z') });
    check('normal day: net 379750 (×0.7595)', Math.abs(normalDay.net - 379750) < 1, normalDay);
  }

  // 9. cleanup (delete cascades prices/platforms/campaigns)
  const del = await j(`/api/listings/${listing.id}`, { method: 'DELETE' });
  check('DELETE listing (cleanup)', del.res.status === 204);
  const dash2 = await j('/api/dashboard');
  const gone = (dash2.body as any)?.listings?.some((l: any) => l.id === listing.id);
  check('listing removed after delete', !gone);

  console.log(failures === 0 ? '\n✅ E2E PASS' : `\n❌ E2E FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
