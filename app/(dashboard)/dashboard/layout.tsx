'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { ListingProvider, useListing } from '@/components/listing-context';
import ListingModal from '@/components/listing-modal';
import { CalendarDays, Tag, Globe, Menu, Plus } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ListingRef {
  id: number;
  name: string;
}

// Global listing selector + "+ Listing" (shared across the 3 tabs).
function ListingBar() {
  const { listingId, setListingId } = useListing();
  const { data } = useSWR<{ listings: ListingRef[] }>('/api/dashboard', fetcher);
  const listings = data?.listings ?? [];
  const selectedId = listingId ?? listings[0]?.id ?? null;
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Quản lý giá theo nền tảng & khuyến mãi</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Đơn vị tiền: VND</span>
          <label className="flex items-center gap-2 text-gray-600">
            Listing
            <select
              value={selectedId ?? ''}
              onChange={(e) => setListingId(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
              aria-label="Chọn listing"
            >
              {listings.length === 0 && <option value="">Chưa có listing</option>}
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Listing
          </Button>
        </div>
      </div>
      {showAdd && <ListingModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// Starter-style sidebar menu (Menu only — Settings now live in the avatar dropdown).
function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Listing-level items (scoped to the selected listing).
  const listingItems = [
    { href: '/dashboard', icon: CalendarDays, label: 'Bảng giá theo ngày' },
    { href: '/dashboard/promotions', icon: Tag, label: 'Khuyến mãi' }
  ];
  // Platform-level item (global — higher level than a listing).
  const platformItem = [{ href: '/dashboard/platforms', icon: Globe, label: 'Nền tảng' }];

  function Item({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    return (
      <Link key={href} href={href}>
        <Button
          variant={pathname === href ? 'secondary' : 'ghost'}
          className={`my-1 w-full justify-start shadow-none ${pathname === href ? 'bg-gray-100' : ''}`}
          onClick={() => setOpen(false)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Mobile toggle */}
      <div className="lg:hidden flex items-center justify-between border-b border-gray-200 bg-white p-3">
        <span className="font-medium">Menu</span>
        <Button variant="ghost" onClick={() => setOpen(!open)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <aside
        className={`w-64 shrink-0 border-r border-gray-200 bg-white lg:bg-gray-50 lg:block ${
          open ? 'block' : 'hidden'
        } lg:relative absolute inset-y-0 left-0 z-40`}
      >
        <nav className="h-full overflow-y-auto p-4">
          <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-gray-400">Listing</div>
          {listingItems.map((it) => <Item key={it.href} {...it} />)}
          <div className="mb-1 mt-4 px-2 text-xs font-medium uppercase tracking-wide text-gray-400">Nền tảng</div>
          {platformItem.map((it) => <Item key={it.href} {...it} />)}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ListingProvider>
      <div className="flex min-h-[calc(100dvh-68px)] max-w-7xl flex-col mx-auto w-full">
        <ListingBar />
        <Sidebar>{children}</Sidebar>
      </div>
    </ListingProvider>
  );
}
