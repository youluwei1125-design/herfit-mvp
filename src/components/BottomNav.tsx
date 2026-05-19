'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: '今日训练', icon: '●' },
  { href: '/weekly', label: '周期视图', icon: '◐' },
  { href: '/history', label: '训练记录', icon: '▣' },
  { href: '/settings', label: '设置', icon: '⚙' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-purple-100 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 shadow-[0_-12px_30px_rgba(124,58,237,0.08)] backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-button px-1 text-xs font-medium transition',
                active
                  ? 'bg-purple-50 text-herfit-primaryDark'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-sm',
                  active ? 'bg-herfit-primary text-white' : 'bg-gray-100 text-gray-500',
                ].join(' ')}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
