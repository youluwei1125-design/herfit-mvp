'use client';

import { useEffect, useState } from 'react';
import { getProfile, getUserSettings, saveProfile, saveUserSettings } from '@/lib/storage';
import type { TrainingPreference, UserSettings } from '@/lib/types';

const preferenceOptions: Array<{ value: TrainingPreference; label: string; description: string }> = [
  { value: 'light', label: '轻量', description: '更短、更温和，适合恢复和忙碌日' },
  { value: 'standard', label: '标准', description: '默认强度，优先稳定完成' },
  { value: 'challenge', label: '挑战', description: '在安全范围内略提高训练刺激' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getUserSettings());
  }, []);

  if (!settings) {
    return <div className="h-48 animate-pulse rounded-card bg-purple-50" />;
  }

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSaved(false);
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = () => {
    saveUserSettings(settings);

    const profile = getProfile();
    if (profile) {
      saveProfile({
        ...profile,
        cycle: {
          lastPeriodStart: settings.lastPeriodStart,
          avgCycleLength: settings.avgCycleLength,
          avgPeriodLength: settings.avgPeriodLength,
        },
      });
    }

    setSaved(true);
  };

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-herfit-primaryDark">设置</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">周期与训练偏好</h1>
      </div>

      <section className="space-y-4 rounded-card bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">最近一次月经开始日期</span>
          <input
            type="date"
            value={settings.lastPeriodStart}
            onChange={(event) => update('lastPeriodStart', event.target.value)}
            className="mt-2 min-h-12 w-full rounded-button border border-purple-100 px-3 outline-none focus:border-herfit-primary"
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-sm font-semibold text-gray-700">
            <span>平均周期长度</span>
            <span className="text-herfit-primaryDark">{settings.avgCycleLength}天</span>
          </span>
          <input
            type="range"
            min="21"
            max="40"
            value={settings.avgCycleLength}
            onChange={(event) => update('avgCycleLength', Number(event.target.value))}
            className="mt-3 w-full accent-herfit-primary"
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-sm font-semibold text-gray-700">
            <span>平均经期长度</span>
            <span className="text-herfit-primaryDark">{settings.avgPeriodLength}天</span>
          </span>
          <input
            type="range"
            min="3"
            max="8"
            value={settings.avgPeriodLength}
            onChange={(event) => update('avgPeriodLength', Number(event.target.value))}
            className="mt-3 w-full accent-herfit-primary"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">默认训练偏好</h2>
        {preferenceOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => update('trainingPreference', option.value)}
            className={[
              'min-h-16 w-full rounded-card border p-4 text-left transition',
              settings.trainingPreference === option.value
                ? 'border-herfit-primary bg-purple-50 text-herfit-primaryDark'
                : 'border-purple-100 bg-white text-gray-700',
            ].join(' ')}
          >
            <span className="block font-semibold">{option.label}</span>
            <span className="mt-1 block text-sm text-gray-500">{option.description}</span>
          </button>
        ))}
      </section>

      <button type="button" onClick={save} className="min-h-12 w-full rounded-button bg-herfit-primary font-semibold text-white">
        保存设置
      </button>
      {saved ? <p className="text-center text-sm font-semibold text-emerald-600">设置已保存</p> : null}

      <p className="rounded-card bg-orange-50 p-4 text-sm leading-6 text-gray-600">
        本产品仅提供训练建议，不替代专业医疗建议。若有明显不适，请优先休息或咨询专业人士。
      </p>
    </section>
  );
}
