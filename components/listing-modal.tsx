'use client';

import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { Listing, Platform } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/modal';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type EditableListing = Listing & { platformIds?: number[] };

// S3 — Add/Edit listing + choose which platforms it uses (per-listing platform selection).
export default function ListingModal({
  initial,
  onClose,
}: {
  initial?: EditableListing;
  onClose: () => void;
}) {
  const { data } = useSWR<{ platforms: Platform[] }>('/api/dashboard', fetcher);
  const platforms = data?.platforms ?? [];
  const { mutate } = useSWRConfig();

  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [selected, setSelected] = useState<number[]>(() =>
    initial ? initial.platformIds ?? [] : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New listing → default to all platforms checked once they load.
  useEffect(() => {
    if (!initial && selected.length === 0 && platforms.length > 0) {
      setSelected(platforms.map((p) => p.id));
    }
  }, [initial, platforms, selected]);

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    if (!name.trim()) {
      setError('Tên listing là bắt buộc');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let listingId = initial?.id;
      const payload = JSON.stringify({
        name: name.trim(),
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      if (!initial) {
        const res = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!res.ok) throw new Error('create failed');
        const created = await res.json();
        listingId = created.id;
      } else {
        const res = await fetch(`/api/listings/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!res.ok) throw new Error('update failed');
      }
      if (listingId) {
        await fetch(`/api/listings/${listingId}/platforms`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platformIds: selected }),
        });
      }
      await mutate('/api/dashboard');
      onClose();
    } catch {
      setError('Không lưu được. Vui lòng thử lại.');
      setSaving(false);
    }
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
        <div>
          <Label>Nền tảng (listing dùng)</Label>
          <div className="mt-1 flex flex-wrap gap-3">
            {platforms.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color ?? '#94a3b8' }} />
                {p.name}
              </label>
            ))}
          </div>
          {platforms.length === 0 && <p className="mt-1 text-xs text-gray-400">Chưa có nền tảng — thêm ở tab “Nền tảng”.</p>}
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
