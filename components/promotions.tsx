'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useListing } from '@/components/listing-context';
import type { Campaign, Platform } from '@/lib/pricing';
import { CAMPAIGN_TYPES } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ListingWithCampaigns {
  id: number;
  name: string;
  platformIds: number[];
  campaigns: Campaign[];
}
interface Data {
  platforms: Platform[];
  listings: ListingWithCampaigns[];
}

function CampaignRow({ campaign, showPriority, onChanged }: { campaign: Campaign; showPriority: boolean; onChanged: () => void }) {
  const { mutate } = useSWRConfig();
  const [saving, setSaving] = useState(false);
  const [priority, setPriority] = useState(campaign.priorityOrder ? String(campaign.priorityOrder) : '');

  async function patch(partial: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    setSaving(false);
    await mutate('/api/dashboard');
    onChanged();
  }

  function savePriority() {
    const n = Number(priority);
    const next = Number.isInteger(n) && n >= 1 ? n : null;
    if (next !== campaign.priorityOrder) void patch({ priorityOrder: next });
    else setPriority(campaign.priorityOrder ? String(campaign.priorityOrder) : '');
  }

  const range =
    campaign.startsAt || campaign.endsAt
      ? `${campaign.startsAt ? campaign.startsAt.slice(0, 10) : '…'} → ${campaign.endsAt ? campaign.endsAt.slice(0, 10) : '…'}`
      : 'Mọi ngày';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm">
      <span className="font-medium text-gray-800">{campaign.name}</span>
      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">−{campaign.discountPercent}%</span>
      <span className="text-xs text-gray-500">{range}</span>
      <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600">
        <input type="checkbox" checked={campaign.active} onChange={(e) => void patch({ active: e.target.checked })} disabled={saving} />
        Hoạt động
      </label>
      {showPriority && (
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Ưu tiên
          <input
            type="number"
            min={1}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            onBlur={savePriority}
            className="w-14 rounded-md border border-gray-300 px-1.5 py-0.5 text-xs"
            disabled={saving}
          />
        </label>
      )}
      <select
        value={campaign.type ?? ''}
        onChange={(e) => void patch({ type: e.target.value || null })}
        disabled={saving}
        className="rounded-md border border-gray-300 px-1.5 py-1 text-xs text-gray-600"
        aria-label="Loại"
      >
        <option value="">Loại…</option>
        {CAMPAIGN_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Xoá campaign"
        onClick={() => {
          if (!window.confirm(`Xoá campaign “${campaign.name}”?`)) return;
          void fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' }).then(() => mutate('/api/dashboard').then(onChanged));
        }}
        className="ml-auto rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddCampaignForm({ listingId, platform, onDone }: { listingId: number; platform: Platform; onDone: () => void }) {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function create() {
    const pct = Number(percent);
    if (!name.trim() || !Number.isInteger(pct) || pct < 0 || pct > 100) return;
    setSaving(true);
    const res = await fetch(`/api/listings/${listingId}/platforms/${platform.id}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), discountPercent: pct, active, startsAt: startsAt || null, endsAt: endsAt || null }),
    });
    setSaving(false);
    if (res.ok) {
      setName(''); setPercent(''); setStartsAt(''); setEndsAt(''); setActive(true);
      await mutate('/api/dashboard');
      onDone();
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="mb-1 text-xs text-gray-500">Tên</div>
          <Input placeholder="Mùa thu −10%" value={name} onChange={(e) => setName(e.target.value)} className="w-44 text-sm" />
        </div>
        <div>
          <div className="mb-1 text-xs text-gray-500">%</div>
          <Input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} className="w-16 text-sm" />
        </div>
        <div>
          <div className="mb-1 text-xs text-gray-500">Từ</div>
          <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-36 text-sm" />
        </div>
        <div>
          <div className="mb-1 text-xs text-gray-500">Đến</div>
          <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-36 text-sm" />
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-600 pb-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Hoạt động
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>Hủy</Button>
        <Button size="sm" onClick={create} disabled={!name.trim() || !Number.isInteger(Number(percent)) || saving}>
          {saving ? 'Đang lưu…' : 'Thêm'}
        </Button>
      </div>
    </div>
  );
}

// --- S5 — Khuyến mãi (per listing) ---
export default function PromotionsPage() {
  const { data, error, isLoading } = useSWR<Data>('/api/dashboard', fetcher);
  const { listingId } = useListing();
  const [openForm, setOpenForm] = useState<number | null>(null);

  if (isLoading) return <div className="p-8 text-gray-500">Đang tải…</div>;
  if (error) return <div className="p-8 text-red-600">Không tải được dữ liệu.</div>;

  const listings = data?.listings ?? [];
  const selected = listings.find((l) => l.id === listingId) ?? listings[0];
  const platforms = (data?.platforms ?? []).filter((p) => selected?.platformIds?.includes(p.id));

  return (
    <section className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Khuyến mãi</h1>
        <p className="text-sm text-gray-500">
          Khuyến mãi riêng của listing <span className="font-medium">{selected?.name ?? '—'}</span>, theo từng nền tảng và khoảng thời gian.
        </p>
      </div>
      {platforms.length === 0 && (
        <p className="text-sm text-gray-400">Listing này chưa gắn nền tảng nào — chọn nền tảng ở tab “Nền tảng” / khi sửa listing.</p>
      )}
      <div className="space-y-6">
        {platforms.map((p) => {
          const showPriority = p.discountRule === 'priority' || p.discountRule === 'sequential';
          const camps = (selected?.campaigns ?? []).filter((c) => c.platformId === p.id);
          return (
            <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color ?? '#94a3b8' }} />
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <span className="text-xs text-gray-400">({p.discountRule})</span>
                </div>
                {selected && (
                  <Button variant="ghost" size="sm" onClick={() => setOpenForm(openForm === p.id ? null : p.id)}>
                    <Plus className="mr-1 h-4 w-4" /> Thêm khuyến mãi
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {camps.length === 0 && <p className="text-xs text-gray-400">Chưa có khuyến mãi nào trên {p.name}.</p>}
                {camps.map((c) => (
                  <CampaignRow key={c.id} campaign={c} showPriority={showPriority} onChanged={() => undefined} />
                ))}
              </div>
              {openForm === p.id && selected && (
                <AddCampaignForm listingId={selected.id} platform={p} onDone={() => setOpenForm(null)} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
