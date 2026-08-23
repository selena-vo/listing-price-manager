'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import type { Listing } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/modal';

// S3 — Add/Edit listing (used from the header listing bar and the day board).
export default function ListingModal({ initial, onClose }: { initial?: Listing; onClose: () => void }) {
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
