'use client';

import { useEffect, useState } from 'react';
import { getWorkoutRecords } from '@/lib/storage';
import type { CyclePhase, WorkoutRecord } from '@/lib/types';

const phaseLabels: Record<CyclePhase, string> = {
  menstrual: '月经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期',
};

const energyLabels = {
  high: '精力充沛',
  medium: '一般',
  low: '很累',
};

export default function HistoryPage() {
  const [records, setRecords] = useState<WorkoutRecord[]>([]);

  useEffect(() => {
    setRecords(getWorkoutRecords());
  }, []);

  const completed = records.filter((record) => record.feedback !== 'skipped');
  const totalMinutes = completed.reduce((sum, record) => sum + record.duration, 0);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-herfit-primaryDark">训练记录</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">你的训练轨迹</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">完成次数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{completed.length}</p>
        </div>
        <div className="rounded-card bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">累计时长</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalMinutes}分</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">最近记录</h2>
        {records.length === 0 ? (
          <div className="rounded-card bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
            完成今日训练后，记录会出现在这里。
          </div>
        ) : (
          records.map((record) => (
            <article key={record.id} className="rounded-card bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-herfit-primaryDark">{record.date}</p>
                  <h3 className="mt-1 text-lg font-bold text-gray-900">{record.workoutName}</h3>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-herfit-accent">
                  {record.duration}分钟
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <p>周期：{phaseLabels[record.cyclePhase]} 第{record.cycleDay}天</p>
                <p>状态：{energyLabels[record.energyLevel]}</p>
              </div>
              {record.notes ? <p className="mt-3 text-sm text-gray-500">备注：{record.notes}</p> : null}
            </article>
          ))
        )}
      </section>
    </section>
  );
}
