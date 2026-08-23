'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useListing } from '@/components/listing-context';
import type { Platform, PlatformPreset } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const RULE_LABELS: Record<string, string> = {
  sum: 'Sum — cộng dồn (tối đa 100%)',
  best: 'Best single — chỉ mức giảm cao nhất',
  priority: 'Priority winner — 1 khuyến mãi thắng theo ưu tiên (Airbnb)',
  sequential: 'Sequential — áp dụng tuần tự (Booking)',
};

interface Data {
  platforms: Platform[];
  listings: { id: number; name: string }[];
}

function PlatformCard({ platform, onChanged }: { platform: Platform; onChanged: () => void }) {
  const { mutate } = useSWRConfig();
  const [commission, setCommission] = useState(String(platform.commissionRate));
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
    if (!window.confirm(`Xoá nền tảng ${platform.name}? Cột và toàn bộ giá của nó sẽ bị xoá.`)) return;
    await fetch(`/api/platforms/${platform.id}`, { method: 'DELETE' });
    await mutate('/api/dashboard');
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: platform.color ?? '#94a3b8' }} />
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

      <div className="grid gap-3 sm:grid-cols-2">
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
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

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
            onClick={() => void create({ name: p.name, color: p.color, commissionRate: p.commissionRate, discountRule: p.discountRule })}
          >
            {p.name} · {p.discountRule} · {p.commissionRate}%
          </Button>
        ))}
        <Input placeholder="Nền tảng khác…" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-44" />
        <Button onClick={() => void create({ name: customName.trim() })} disabled={!customName.trim()}>
          Thêm
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">
        Preset tự điền hoa hồng + discount rule (SPEC §4) — vẫn chỉnh được sau. Quản lý khuyến mãi ở tab “Khuyến mãi”.
      </p>
    </div>
  );
}

// --- S4 — Nền tảng (platforms) ---
export default function PlatformsPage() {
  const { data, error, isLoading } = useSWR<Data>('/api/dashboard', fetcher);
  const { listingId } = useListing();

  if (isLoading) return <div className="p-8 text-gray-500">Đang tải…</div>;
  if (error) return <div className="p-8 text-red-600">Không tải được dữ liệu.</div>;

  const platforms = data?.platforms ?? [];
  const listings = data?.listings ?? [];
  const selected = listings.find((l) => l.id === listingId) ?? listings[0];

  return (
    <section className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Nền tảng</h1>
        <p className="text-sm text-gray-500">
          Hoa hồng (hoa hồng) và discount rule của từng nền tảng (dùng chung cho listing <span className="font-medium">{selected?.name ?? '—'}</span>).
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
