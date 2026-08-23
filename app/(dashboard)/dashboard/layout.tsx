'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarDays, Tag, Globe, Settings } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/dashboard', icon: CalendarDays, label: 'Bảng giá theo ngày' },
    { href: '/dashboard/promotions', icon: Tag, label: 'Khuyến mãi' },
    { href: '/dashboard/platforms', icon: Globe, label: 'Nền tảng' }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Tab bar */}
      <div className="border-b border-gray-200 px-4 lg:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link key={t.href} href={t.href} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${active ? 'border-teal-600 font-medium text-teal-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Small settings link (starter pages) */}
      <div className="px-4 lg:px-6 pt-3">
        <Link href="/dashboard/general" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
          <Settings className="h-3.5 w-3.5" />
          Cài đặt (General · Activity · Security)
        </Link>
      </div>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
