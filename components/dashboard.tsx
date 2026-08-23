'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import Link from 'next/link';
import { computePrice } from '@/lib/pricing/rule-engine';
import type { Campaign, Listing, ListingPrice, Platform } from '@/lib/pricing';
import { formatVND } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type DashboardPlatform = Platform & { campaigns: Campaign[] };
type DashboardListing = Listing & { prices: ListingPrice[] };
interface DashboardData {
  platforms: DashboardPlatform[];
  listings: DashboardListing[];
}

const RULE_HINTS: Record<string, string> = {
  sum: 'S · cộng dồn',
  best: 'B · mức cao nhất',
  priority: 'P · 1 thắng theo ưu tiên',
  sequential: 'Q · tuần tự',
};

function priceFor(listing: DashboardListing, platformId: number): ListingPrice | null {
  return listing.prices.find((p) => p.platformId === platformId) ?? null;
}

function activeCampaigns(platform: DashboardPlatform): Campaign[] {
  const now = Date.now();
  return platform.campaigns.filter((c) => {
    if (!c.active) return false;
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return false;
    if (c.endsAt && new Date(c.endsAt).getTime() < now) return false;
    return true;
  });
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- S2 — Set/Edit price ---
function PriceModal({
  listing,
  platform,
  current,
  onClose,
}: {
  listing: DashboardListing;
  platform: DashboardPlatform;
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
        campaigns: platform.campaigns,
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
    <Modal title={`Giá trên ${platform.name} — ${listing.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="price">Giá mỗi đêm (₫)</Label>
          <Input
            id="price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ví dụ: 1200000"
            className="mt-1 text-lg"
            autoFocus
          />
          {price !== '' && !valid && (
            <p className="mt-1 text-xs text-red-600">Nhập số nguyên lớn hơn 0</p>
          )}
        </div>
        <div>
          <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: giá cuối tuần"
            className="mt-1"
          />
        </div>
        {preview && (
          <div className="rounded-xl bg-teal-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Khách trả</span>
              <span className="font-medium">{formatVND(preview.guestPrice)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-gray-600">Bạn nhận (sau hoa hồng {platform.commissionRate}%)</span>
              <span className="font-medium text-green-700">{formatVND(preview.net)}</span>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
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
    if (!name.trim()) {
      setError('Tên listing là bắt buộc');
      return;
    }
    setSaving(true);
    const res = await fetch(initial ? `/api/listings/${initial.id}` : '/api/listings', {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        location: location.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      setError('Không lưu được. Vui lòng thử lại.');
      setSaving(false);
      return;
    }
    await mutate('/api/dashboard');
    onClose();
  }

  return (
    <Modal title={initial ? 'Sửa listing' : 'Thêm listing'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="lname">Tên listing</Label>
          <Input
            id="lname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Villa Biển Mũi Né"
            className="mt-1"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="llocation">Vị trí (tùy chọn)</Label>
          <Input
            id="llocation"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ví dụ: Mũi Né, Bình Thuận"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="lnotes">Ghi chú (tùy chọn)</Label>
          <Input
            id="lnotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- S1 — Dashboard (price board) ---
export default function PriceBoard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>('/api/dashboard', fetcher);
  const [priceTarget, setPriceTarget] = useState<{
    listing: DashboardListing;
    platform: DashboardPlatform;
    current: ListingPrice | null;
  } | null>(null);
  const [showAddListing, setShowAddListing] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  if (isLoading) return <div className="p-8 text-gray-500">Đang tải…</div>;
  if (error) return <div className="p-8 text-red-600">Không tải được dữ liệu.</div>;

  const platforms = data?.platforms ?? [];
  const listings = data?.listings ?? [];

  if (platforms.length === 0) {
    return (
      <section className="p-4 lg:p-8">
        <h1 className="mb-2 text-2xl font-semibold">Dashboard</h1>
        <p className="mb-4 text-gray-500">
          Chưa có nền tảng nào. Thêm nền tảng (Airbnb, Booking.com, Trip.com…) để bắt đầu theo dõi giá.
        </p>
        <Button asChild>
          <Link href="/dashboard/platforms">Đi tới Platforms</Link>
        </Button>
      </section>
    );
  }

  async function removeListing(id: number) {
    if (!window.confirm('Xoá listing này và toàn bộ giá của nó?')) return;
    await fetch(`/api/listings/${id}`, { method: 'DELETE' });
    await mutate();
  }

  return (
    <section className="p-4 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bảng giá</h1>
          <p className="text-sm text-gray-500">
            Giá niêm yết · khách trả · bạn nhận (sau hoa hồng & khuyến mãi) — click vào ô giá để sửa
          </p>
        </div>
        <Button onClick={() => setShowAddListing(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm listing
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 bg-white p-3 text-left">Listing</th>
              {platforms.map((p) => (
                <th key={p.id} className="p-3 text-center" title={RULE_HINTS[p.discountRule]}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: p.color ?? '#94a3b8' }}
                    />
                    {p.name}
                  </div>
                  <div className="text-xs font-normal text-gray-400">
                    {p.commissionRate}% · {RULE_HINTS[p.discountRule]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 && (
              <tr>
                <td colSpan={platforms.length + 1} className="p-10 text-center text-gray-500">
                  Chưa có listing nào. Nhấn “Thêm listing” để bắt đầu.
                </td>
              </tr>
            )}
            {listings.map((l) => (
              <tr key={l.id} className="border-b border-gray-100 last:border-0">
                <td className="sticky left-0 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{l.name}</div>
                      {l.location && <div className="text-xs text-gray-400">{l.location}</div>}
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label="Sửa listing"
                        onClick={() => setEditingListing(l)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Xoá listing"
                        onClick={() => removeListing(l.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </td>
                {platforms.map((p) => {
                  const price = priceFor(l, p.id);
                  const camps = activeCampaigns(p);
                  const breakdown = price
                    ? computePrice({
                        listedPrice: price.pricePerNight,
                        commissionRate: p.commissionRate,
                        rule: p.discountRule,
                        campaigns: p.campaigns,
                      })
                    : null;
                  return (
                    <td key={p.id} className="p-2 text-center align-top">
                      <button
                        type="button"
                        onClick={() => setPriceTarget({ listing: l, platform: p, current: price })}
                        className={`w-full rounded-xl p-2 transition hover:bg-teal-50 ${
                          price ? '' : 'border border-dashed border-gray-300'
                        }`}
                      >
                        {price && breakdown ? (
                          <>
                            <div className="font-semibold text-gray-900">
                              {formatVND(price.pricePerNight)}
                            </div>
                            {camps.length > 0 && (
                              <div className="mt-0.5 flex justify-center gap-1">
                                {camps.map((c) => (
                                  <span
                                    key={c.id}
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                      breakdown.winningCampaignId === c.id
                                        ? 'bg-amber-100 font-medium text-amber-700'
                                        : 'bg-orange-50 text-orange-600'
                                    }`}
                                  >
                                    −{c.discountPercent}%
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-[11px] text-gray-400">
                              guest ≈ {formatVND(breakdown.guestPrice)}
                            </div>
                            <div className="text-[11px] text-green-600">
                              net ≈ {formatVND(breakdown.net)}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {priceTarget && (
        <PriceModal
          listing={priceTarget.listing}
          platform={priceTarget.platform}
          current={priceTarget.current}
          onClose={() => setPriceTarget(null)}
        />
      )}
      {showAddListing && <ListingModal onClose={() => setShowAddListing(false)} />}
      {editingListing && <ListingModal initial={editingListing} onClose={() => setEditingListing(null)} />}
    </section>
  );
}
