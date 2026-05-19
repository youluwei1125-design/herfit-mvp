'use client';

import { useState } from 'react';

export default function ScienceCard({
  content,
  nutritionTip,
  loading,
}: {
  content: string;
  nutritionTip?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-card bg-white p-5 shadow-sm">
      <button type="button" onClick={() => setOpen((current) => !current)} className="w-full text-left">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">💡 今天为什么这样练？</h2>
          <span className="text-sm font-semibold text-herfit-primaryDark">{open ? '收起' : '展开'}</span>
        </div>
      </button>
      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded-button bg-purple-50" />
      ) : (
        <div className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
          <p className={open ? '' : 'line-clamp-2'}>{content || '今天的安排会结合你的周期阶段、状态和训练目标，优先保证安全与持续性。'}</p>
          {open && nutritionTip ? <p className="rounded-button bg-orange-50 p-3 text-herfit-accent">{nutritionTip}</p> : null}
        </div>
      )}
    </section>
  );
}
