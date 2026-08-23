'use client';

import { Fragment, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useListing } from '@/components/listing-context';
import { computePrice } from '@/lib/pricing/rule-engine';
import type { Campaign, Listing, ListingPrice, Platform } from '@/lib/pricing';
import { formatVND } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Pencil, Plus, X } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type DPlatform = Platform & { campaigns: Campaign[] };
type DListing = Listing & { prices: ListingPrice[] };
interface DashboardData {
  platforms: DPlatform[];
  listings: DListing[];
}

const RULE_SHORT: Record<string, string> = { sum: 'S', best: 'B', priority: 'P', sequential: 'Q' };
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

function activeOnDate(platform: DPlatform, date: Date): Campaign[] {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return platform.campaigns.filter((c) => {
    if (!c.active) return false;
    if (c.startsAt && day.getTime() < parseDateOnly(c.startsAt).getTime()) return false;
    if (c.endsAt && day.getTime() > parseDateOnly(c.endsAt).getTime()) return false;
    return true;
  });
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- S2 — set BASE price per (listing, platform) ---
function BasePriceModal({
  listing,
  platform,
  current,
  onClose,
}: {
  listing: DListing;
  platform: DPlatform;
  current: ListingPrice | null;
  onClose: () => void;
}) {
  const [price, setPrice] = useState(current ? String(current.pricePerNight) : '');
  const [note, setNote] = useState(current?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const parsed = Number(price);
  const valid = Number.isInteger(parsed) && parsed > 0;
  const preview = valid
    ? computePrice({
        listedPrice: parsed,
        commissionRate: platform.commissionRate,
        rule: platform.discountRule,
        campaigns: [],
      })
    : null;

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}/platforms/${platform.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricePerNight: parsed, note: note.trim() || null }),
      });
      if (!res.ok) throw new Error('save failed');
      await mutate('/api/dashboard');
      onClose();
    } catch {
      setError('Không lưu được. Vui lòng thử lại.');
      setSaving(false);
    }
  }

  return (
    <Modal title={`Giá cơ bản — ${platform.name} · ${listing.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Đây là <strong>giá cơ bản</strong> áp dụng cho mọi ngày; ngày có khuyến mãi sẽ được điều chỉnh theo campaign (S5).
        </p>
        <div>
          <Label htmlFor="price">Giá mỗi đêm (₫)</Label>
          <Input
            id="price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ví dụ: 500000"
            className="mt-1 text-lg"
            autoFocus
          />
          {price !== '' && !valid && <p className="mt-1 text-xs text-red-600">Nhập số nguyên lớn hơn 0</p>}
        </div>
        <div>
          <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
        </div>
        {preview && (
          <div className="rounded-xl bg-teal-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Phí ({platform.commissionRate}%)</span>
              <span className="font-medium">{formatVND(preview.commission)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-gray-600">Ròng (sau phí)</span>
              <span className="font-medium text-green-700">{formatVND(preview.net)}</span>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- S3 — Add/Edit listing ---
function ListingModal({ initial, onClose }: { initial?: Listing; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  async function save() {
    if (!name.trim()) { setError('Tên listing là bắt buộc'); return; }
    setSaving(true);
    const res = await fetch(initial ? `/api/listings/${initial.id}` : '/api/listings', {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), location: location.trim() || null, notes: notes.trim() || null }),
    });
    if (!res.ok) { setError('Không lưu được.'); setSaving(false); return; }
    await mutate('/api/dashboard');
    onClose();
  }

  return (
    <Modal title={initial ? 'Sửa listing' : 'Thêm listing'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="lname">Tên listing</Label>
          <Input id="lname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
        </div>
        <div>
          <Label htmlFor="llocation">Vị trí (tùy chọn)</Label>
          <Input id="llocation" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="lnotes">Ghi chú (tùy chọn)</Label>
          <Input id="lnotes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// --- S1 — Day price board ---
export default function DayBoard() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/dashboard', fetcher);
  const today = useMemo(() => new Date(), []);
  const { listingId } = useListing();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [baseTarget, setBaseTarget] = useState<{ listing: DListing; platform: DPlatform; current: ListingPrice | null } | null>(null);
  const [showAddListing, setShowAddListing] = useState(false);

  const platforms = data?.platforms ?? [];
  const listings = data?.listings ?? [];
  const selectedListing = listings.find((l) => l.id === listingId) ?? listings[0];

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
      <section className="p-4 lg:p-8">
        <h1 className="mb-2 text-2xl font-semibold">Bảng giá theo ngày</h1>
        <p className="mb-4 text-gray-500">Chưa có nền tảng nào. Thêm nền tảng để bắt đầu theo dõi giá.</p>
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
          <Button size="sm" onClick={() => setShowAddListing(true)}>
            <Plus className="mr-1 h-4 w-4" /> Listing
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 bg-gray-50 p-3 text-left" rowSpan={2}>Ngày</th>
              {platforms.map((p) => (
                <th key={p.id} colSpan={2} className="border-l border-gray-200 p-2 pb-1 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color ?? '#94a3b8' }} />
                    {p.name}
                    <button
                      type="button"
                      aria-label={`Đặt giá cơ bản cho ${p.name}`}
                      onClick={() => selectedListing && setBaseTarget({ listing: selectedListing, platform: p, current: selectedListing.prices.find((x) => x.platformId === p.id) ?? null })}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] font-normal text-gray-400">
                    {RULE_SHORT[p.discountRule] ?? ''} · hoa hồng {p.commissionRate}%
                  </div>
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              {platforms.map((p) => (
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
                  {platforms.map((p) => {
                    const price = selectedListing?.prices.find((x) => x.platformId === p.id) ?? null;
                    const promo = price ? activeOnDate(p, d) : [];
                    const breakdown = price
                      ? computePrice({ listedPrice: price.pricePerNight, commissionRate: p.commissionRate, rule: p.discountRule, campaigns: promo })
                      : null;
                    return (
                      <Fragment key={p.id}>
                        <td className="border-l border-gray-200 p-2 text-center align-middle">
                          {breakdown ? (
                            <div className={promo.length > 0 ? 'rounded-xl bg-blue-50 py-1' : ''}>
                              {promo.length > 0 && (
                                <div className="mb-0.5 text-[10px] font-medium text-blue-600">Khuyến mãi</div>
                              )}
                              <div className="font-semibold text-gray-900">{formatVND(breakdown.guestPrice)}</div>
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
        Cột là {platforms.map((p) => p.name).join(' · ')}. Ngày in đậm có khuyến mãi; click biểu tượng ✎ ở tên nền tảng để đặt giá cơ bản.
      </p>

      {baseTarget && (
        <BasePriceModal
          listing={baseTarget.listing}
          platform={baseTarget.platform}
          current={baseTarget.current}
          onClose={() => setBaseTarget(null)}
        />
      )}
      {showAddListing && <ListingModal onClose={() => setShowAddListing(false)} />}
    </section>
  );
}
