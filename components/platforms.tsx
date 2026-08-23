'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { Campaign, Platform, PlatformPreset } from '@/lib/pricing';
import { CAMPAIGN_TYPES } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const RULE_LABELS: Record<string, string> = {
  sum: 'Sum — cộng dồn (tối đa 100%)',
  best: 'Best single — chỉ mức giảm cao nhất',
  priority: 'Priority winner — 1 khuyến mãi thắng theo ưu tiên (Airbnb)',
  sequential: 'Sequential — áp dụng tuần tự (Booking)',
};

type DashboardPlatform = Platform & { campaigns: Campaign[] };
interface DashboardData {
  platforms: DashboardPlatform[];
}

// --- Campaign row (S4) ---
function CampaignEditor({
  campaign,
  showPriority,
  onChanged,
}: {
  campaign: Campaign;
  showPriority: boolean;
  onChanged: () => void;
}) {
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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm">
      <span className="font-medium text-gray-800">{campaign.name}</span>
      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
        −{campaign.discountPercent}%
      </span>
      <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={campaign.active}
          onChange={(e) => void patch({ active: e.target.checked })}
          disabled={saving}
        />
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
        aria-label="Loại campaign"
      >
        <option value="">Loại…</option>
        {CAMPAIGN_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Xoá campaign"
        onClick={() => {
          if (!window.confirm(`Xoá campaign “${campaign.name}”?`)) return;
          void fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' }).then(() =>
            mutate('/api/dashboard').then(onChanged),
          );
        }}
        className="ml-auto rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Add campaign form (S4) ---
function AddCampaignForm({
  platform,
  onDone,
}: {
  platform: DashboardPlatform;
  onDone: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function create() {
    const pct = Number(percent);
    if (!name.trim() || !Number.isInteger(pct) || pct < 0 || pct > 100) return;
    setSaving(true);
    const res = await fetch(`/api/platforms/${platform.id}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), discountPercent: pct, active }),
    });
    setSaving(false);
    if (res.ok) {
      setName('');
      setPercent('');
      setActive(true);
      await mutate('/api/dashboard');
      onDone();
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Tên campaign (vd: Mùa thu −10%)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-52 text-sm"
        />
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="%"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className="w-16 text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Hoạt động
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Hủy
        </Button>
        <Button
          size="sm"
          onClick={create}
          disabled={!name.trim() || !Number.isInteger(Number(percent)) || saving}
        >
          {saving ? 'Đang lưu…' : 'Thêm campaign'}
        </Button>
      </div>
    </div>
  );
}

// --- Platform card (S4) ---
function PlatformCard({
  platform,
  onChanged,
}: {
  platform: DashboardPlatform;
  onChanged: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [commission, setCommission] = useState(String(platform.commissionRate));
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [saving, setSaving] = useState(false);

  async function patch(partial: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/platforms/${platform.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    setSaving(false);
    await mutate('/api/dashboard');
    onChanged();
  }

  function saveCommission() {
    const n = Number(commission);
    if (Number.isInteger(n) && n >= 0 && n <= 100 && n !== platform.commissionRate) {
      void patch({ commissionRate: n });
    } else {
      setCommission(String(platform.commissionRate));
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Xoá nền tảng ${platform.name}? Cột của nó và toàn bộ giá đã lưu sẽ bị xoá.`,
      )
    )
      return;
    await fetch(`/api/platforms/${platform.id}`, { method: 'DELETE' });
    await mutate('/api/dashboard');
    onChanged();
  }

  const showPriority = platform.discountRule === 'priority' || platform.discountRule === 'sequential';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: platform.color ?? '#94a3b8' }}
          />
          <h2 className="text-lg font-semibold">{platform.name}</h2>
        </div>
        <button
          type="button"
          aria-label="Xoá nền tảng"
          onClick={remove}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`commission-${platform.id}`}>Hoa hồng (%)</Label>
          <Input
            id={`commission-${platform.id}`}
            type="number"
            min={0}
            max={100}
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            onBlur={saveCommission}
            disabled={saving}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`rule-${platform.id}`}>Discount rule</Label>
          <select
            id={`rule-${platform.id}`}
            value={platform.discountRule}
            onChange={(e) => void patch({ discountRule: e.target.value })}
            disabled={saving}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {Object.entries(RULE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Campaigns</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAddCampaign(!showAddCampaign)}>
          <Plus className="mr-1 h-4 w-4" />
          Thêm
        </Button>
      </div>
      <div className="space-y-2">
        {platform.campaigns.length === 0 && (
          <p className="text-xs text-gray-400">Chưa có campaign nào.</p>
        )}
        {platform.campaigns.map((c) => (
          <CampaignEditor
            key={c.id}
            campaign={c}
            showPriority={showPriority}
            onChanged={onChanged}
          />
        ))}
      </div>
      {showAddCampaign && (
        <AddCampaignForm platform={platform} onDone={() => setShowAddCampaign(false)} />
      )}
    </div>
  );
}

// --- Add platform (presets + custom) ---
function AddPlatform({ onChanged }: { onChanged: () => void }) {
  const { data } = useSWR<{ presets: PlatformPreset[] }>('/api/platforms/presets', fetcher);
  const { mutate } = useSWRConfig();
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function create(body: Record<string, unknown>) {
    const res = await fetch('/api/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setCustomName('');
      setError(null);
      await mutate('/api/dashboard');
      onChanged();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? 'Không thêm được nền tảng.');
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
      <h2 className="mb-3 font-medium">Thêm nền tảng</h2>
      <div className="flex flex-wrap items-center gap-2">
        {data?.presets.map((p) => (
          <Button
            key={p.key}
            variant="outline"
            onClick={() =>
              void create({
                name: p.name,
                color: p.color,
                commissionRate: p.commissionRate,
                discountRule: p.discountRule,
              })
            }
          >
            {p.name} · {p.discountRule}
          </Button>
        ))}
        <Input
          placeholder="Nền tảng khác…"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="w-44"
        />
        <Button onClick={() => void create({ name: customName.trim() })} disabled={!customName.trim()}>
          Thêm
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">
        Preset tự điền hoa hồng + discount rule theo SPEC §4 — vẫn chỉnh được sau.
      </p>
    </div>
  );
}

// --- S4 — Platforms ---
export default function PlatformsPage() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/dashboard', fetcher);

  if (isLoading) return <div className="p-8 text-gray-500">Đang tải…</div>;
  if (error) return <div className="p-8 text-red-600">Không tải được dữ liệu.</div>;

  const platforms = data?.platforms ?? [];

  return (
    <section className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Nền tảng</h1>
        <p className="text-sm text-gray-500">
          Hoa hồng (hoa hồng), discount rule và chiến dịch khuyến mãi cho từng nền tảng.
        </p>
      </div>
      <AddPlatform onChanged={() => undefined} />
      <div className="grid gap-4 lg:grid-cols-2">
        {platforms.map((p) => (
          <PlatformCard key={p.id} platform={p} onChanged={() => undefined} />
        ))}
      </div>
    </section>
  );
}
