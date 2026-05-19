'use client';

import { useEffect, useState } from 'react';
import { getCycleContext, getCyclePhaseRanges, getPhaseTrainingMeta } from '@/lib/cycle';
import { getUserSettings } from '@/lib/storage';
import type { CycleContext, CyclePhase, UserSettings } from '@/lib/types';

const phaseLabels: Record<CyclePhase, string> = {
  menstrual: '月经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期',
};

const phaseStyles: Record<CyclePhase, string> = {
  menstrual: 'border-pink-100 bg-pink-50 text-pink-700',
  follicular: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  ovulation: 'border-orange-100 bg-orange-50 text-orange-700',
  luteal: 'border-blue-100 bg-blue-50 text-blue-700',
};

export default function WeeklyPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [cycleContext, setCycleContext] = useState<CycleContext | null>(null);

  useEffect(() => {
    const nextSettings = getUserSettings();
    setSettings(nextSettings);
    setCycleContext(getCycleContext(nextSettings));
  }, []);

  if (!settings || !cycleContext) {
    return <div className="h-48 animate-pulse rounded-card bg-purple-50" />;
  }

  const ranges = getCyclePhaseRanges(settings);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-herfit-primaryDark">周期视图</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">本周期概览</h1>
      </div>

      <section className={`rounded-card border p-5 ${phaseStyles[cycleContext.currentPhase]}`}>
        <p className="text-sm font-semibold">当前阶段</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">
          {phaseLabels[cycleContext.currentPhase]} 第{cycleContext.phaseDay}天
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          周期第{cycleContext.cycleDay}天，距离下次经期约{cycleContext.daysToNextPeriod}天
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">本周期关键日期</h2>
        {ranges.map((range) => (
          <div key={range.phase} className={`rounded-card border p-4 ${phaseStyles[range.phase]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{range.label}</p>
              <p className="text-sm text-gray-600">
                {range.start} 至 {range.end}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">阶段训练建议</h2>
        {ranges.map((range) => {
          const meta = getPhaseTrainingMeta(range.phase);

          return (
            <div key={range.phase} className="rounded-card bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">{range.label}</h3>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-herfit-primaryDark">
                  {meta.intensityRange}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">{meta.description}</p>
              <p className="mt-3 text-sm text-gray-500">推荐：{meta.recommendedTypes.join('、')}</p>
              <p className="mt-1 text-sm text-gray-500">避免：{meta.avoidTypes.join('、')}</p>
            </div>
          );
        })}
      </section>
    </section>
  );
}
