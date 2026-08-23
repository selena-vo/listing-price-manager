'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ListingProvider } from '@/components/listing-context';
import { CalendarDays, Tag, Globe, Menu } from 'lucide-react';

// Sidebar: on desktop a static left menu; on mobile a top "Menu" bar opening a left drawer.
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
      <Link key={href} href={href} onClick={() => setOpen(false)}>
        <Button
          variant={pathname === href ? 'secondary' : 'ghost'}
          className={`my-1 w-full justify-start shadow-none ${pathname === href ? 'bg-gray-100' : ''}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </Link>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="font-medium">Menu</span>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Mở menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Backdrop on mobile when the drawer is open */}
        {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

        {/* Drawer (mobile) / static sidebar (desktop) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white transition-transform duration-200 lg:static lg:z-auto lg:transform-none lg:border-r lg:border-gray-200 lg:bg-gray-50 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-gray-400">Listing</div>
            {listingItems.map((it) => <Item key={it.href} {...it} />)}
            <div className="mb-1 mt-4 px-2 text-xs font-medium uppercase tracking-wide text-gray-400">Nền tảng</div>
            {platformItem.map((it) => <Item key={it.href} {...it} />)}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ListingProvider>
      <div className="flex min-h-[calc(100dvh-68px)] max-w-7xl flex-col mx-auto w-full">
        <Sidebar>{children}</Sidebar>
      </div>
    </ListingProvider>
  );
}
