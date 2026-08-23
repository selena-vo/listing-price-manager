'use client';

import { Fragment, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useListing } from '@/components/listing-context';
import ListingModal from '@/components/listing-modal';
import { computePrice } from '@/lib/pricing/rule-engine';
import type { Campaign, Listing, ListingPrice, Platform } from '@/lib/pricing';
import { formatVND } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type DPlatform = Platform;
type DListing = Listing & { prices: ListingPrice[]; platformIds: number[]; campaigns: Campaign[] };
interface DashboardData {
  platforms: DPlatform[];
  listings: DListing[];
}

const WEEKDAYS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']; // index = date.getDay()
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function activeOnDate(campaigns: Campaign[], date: Date): Campaign[] {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return campaigns.filter((c) => {
    if (!c.active) return false;
    if (c.startsAt && day.getTime() < parseDateOnly(c.startsAt).getTime()) return false;
    if (c.endsAt && day.getTime() > parseDateOnly(c.endsAt).getTime()) return false;
    return true;
  });
}

// --- Base price (giá cài đặt) input per listing × platform — inline, saves on blur ---
function BasePriceInput({ listing, platform }: { listing: DListing; platform: DPlatform }) {
  const { mutate } = useSWRConfig();
  const current = listing.prices.find((x) => x.platformId === platform.id) ?? null;
  const [value, setValue] = useState(current ? String(current.pricePerNight) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      setValue(current ? String(current.pricePerNight) : '');
      return;
    }
    setSaving(true);
    await fetch(`/api/listings/${listing.id}/platforms/${platform.id}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricePerNight: n }),
    });
    setSaving(false);
    await mutate('/api/dashboard');
  }

  return (
    <div className="mt-1 flex items-center justify-center gap-1">
      <span className="text-[10px] text-gray-400">Giá cài đặt</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="0"
        disabled={saving}
        aria-label={`Giá cài đặt cho ${platform.name}`}
        className="w-24 rounded-md border border-gray-300 px-1.5 py-0.5 text-right text-xs"
      />
      <span className="text-[10px] text-gray-400">₫</span>
    </div>
  );
}

// --- S1 — Day price board ---
export default function DayBoard() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/dashboard', fetcher);
  const today = useMemo(() => new Date(), []);
  const { listingId } = useListing();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const platforms = data?.platforms ?? [];
  const listings = data?.listings ?? [];
  const selectedListing = listings.find((l) => l.id === listingId) ?? listings[0];
  const boardPlatforms = platforms.filter((p) => selectedListing?.platformIds?.includes(p.id));

  const days = useMemo(() => {
    const count = new Date(view.year, view.month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(view.year, view.month, i + 1));
  }, [view]);

  function go(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  if (isLoading) return <div className="p-8 text-gray-500">Đang tải…</div>;
  if (error) return <div className="p-8 text-red-600">Không tải được dữ liệu.</div>;
  if (platforms.length === 0) {
    return (
      <section className="p-4 lg:p-6">
        <h1 className="mb-2 text-2xl font-semibold">Bảng giá theo ngày</h1>
        <p className="mb-4 text-gray-500">Chưa có nền tảng nào. Thêm nền tảng để bắt đầu theo dõi giá.</p>
        <Button asChild><a href="/dashboard/platforms">Đi tới Nền tảng</a></Button>
      </section>
    );
  }
  if (boardPlatforms.length === 0) {
    return (
      <section className="p-4 lg:p-6">
        <h1 className="mb-2 text-2xl font-semibold">Bảng giá theo ngày</h1>
        <p className="mb-4 text-gray-500">
          Listing <span className="font-medium">{selectedListing?.name ?? '—'}</span> chưa gắn nền tảng nào. Sửa
          listing (nút “Listing” trên thanh trên, hoặc chọn nền tảng ở tab Nền tảng) để gắn nền tảng.
        </p>
        <Button asChild><a href="/dashboard/platforms">Đi tới Nền tảng</a></Button>
      </section>
    );
  }

  return (
    <section className="p-4 lg:p-6">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Listing: <span className="font-medium">{selectedListing?.name ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => go(-1)} aria-label="Tháng trước">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-medium">
            {MONTH_NAMES[view.month]} năm {view.year}
          </span>
          <Button variant="outline" size="sm" onClick={() => go(1)} aria-label="Tháng sau">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}>
            Về hôm nay
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 bg-gray-50 p-3 text-left" rowSpan={2}>Ngày</th>
              {boardPlatforms.map((p) => (
                <th key={p.id} colSpan={2} className="border-l border-gray-200 p-2 pb-1 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color ?? '#94a3b8' }} />
                    {p.name}
                  </div>
                  <div className="text-[11px] font-normal text-gray-400">
                    Hoa hồng {p.commissionRate}%
                  </div>
                  {selectedListing && <BasePriceInput key={selectedListing.id} listing={selectedListing} platform={p} />}
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              {boardPlatforms.map((p) => (
                <Fragment key={p.id}>
                  <th className="border-l border-gray-200 p-2 text-center text-xs font-medium text-gray-700">Giá cài đặt</th>
                  <th className="border-r border-gray-200 p-2 text-center text-xs font-medium text-gray-700">Ròng (sau phí)</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const isToday = sameDay(d, today);
              return (
                <tr key={d.getTime()} className={`border-b border-gray-100 last:border-0 ${isToday ? 'bg-teal-50/60' : ''}`}>
                  <td className="sticky left-0 bg-white p-3">
                    <div className="font-medium text-gray-800">
                      {String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-400">{WEEKDAYS[d.getDay()]}</div>
                    {isToday && <div className="mt-0.5 text-[10px] font-medium text-teal-600">Hôm nay</div>}
                  </td>
                  {boardPlatforms.map((p) => {
                    const price = selectedListing?.prices.find((x) => x.platformId === p.id) ?? null;
                    const promo = price
                      ? activeOnDate(selectedListing.campaigns.filter((c) => c.platformId === p.id), d)
                      : [];
                    const breakdown = price
                      ? computePrice({ listedPrice: price.pricePerNight, commissionRate: p.commissionRate, rule: p.discountRule, campaigns: promo, now: d })
                      : null;
                    return (
                      <Fragment key={p.id}>
                        <td className="border-l border-gray-200 p-2 text-center align-middle">
                          {breakdown ? (
                            <div className={promo.length > 0 ? 'rounded-xl bg-blue-50 py-1' : ''}>
                              {promo.length > 0 && (
                                <div className="mb-0.5 text-[10px] font-medium text-blue-600">Khuyến mãi</div>
                              )}
                              {/* Giá cài đặt (gốc); khi có khuyến mãi, gạch ngang + hiện giá khuyến mãi đã tính */}
                              <div className={promo.length > 0 ? 'text-[11px] text-gray-400 line-through' : 'font-semibold text-gray-900'}>
                                {formatVND(price!.pricePerNight)}
                              </div>
                              {promo.length > 0 && (
                                <div className="font-semibold text-blue-700">{formatVND(breakdown.guestPrice)}</div>
                              )}
                              <div className="text-[10px] text-gray-400">
                                phí {p.commissionRate}% · {formatVND(breakdown.commission)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="border-r border-gray-200 p-2 text-center align-middle">
                          {breakdown ? (
                            <div className="font-semibold text-green-600">{formatVND(breakdown.net)}</div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend note */}
      <p className="mt-3 text-xs text-gray-400">
        Cột là {boardPlatforms.map((p) => p.name).join(' · ')}. Ngày nền xanh có khuyến mãi (giá gạch ngang = giá cài đặt,
        giá xanh = giá khuyến mãi đã tính). <strong>Nhập số vào ô “Giá cài đặt” dưới tên mỗi nền tảng</strong> để đặt giá
        cơ bản cho listing này.
      </p>
    </section>
  );
}
