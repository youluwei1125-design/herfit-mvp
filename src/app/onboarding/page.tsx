'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/lib/storage';
import type { UserProfile } from '@/lib/types';

type Goal = UserProfile['goal'];
type Level = UserProfile['level'];
type Status = UserProfile['status'];

interface FormState {
  goal: Goal | '';
  level: Level | '';
  height: number;
  weight: number;
  weeklyDays: number;
  sessionMinutes: number;
  lastPeriodStart: string;
  avgCycleLength: number;
  status: Status | '';
}

const totalSteps = 6;

const goalOptions: Array<{ value: Goal; title: string; description: string }> = [
  { value: 'fat_loss', title: '减脂', description: '提高消耗，建立可持续训练节奏' },
  { value: 'toning', title: '塑形', description: '围绕线条、力量和体态做编排' },
  { value: 'fitness', title: '体能', description: '提升心肺、耐力和日常活力' },
];

const levelOptions: Array<{ value: Level; title: string; description: string }> = [
  { value: 'beginner', title: '入门', description: '刚开始训练，优先动作安全和习惯建立' },
  { value: 'intermediate', title: '有基础', description: '能稳定完成常见自重训练' },
  { value: 'advanced', title: '进阶', description: '适合更高密度和更强挑战' },
];

const statusOptions: Array<{ value: Status; title: string; description: string; disabled?: boolean }> = [
  { value: 'normal', title: '日常健身', description: '根据周期和当天状态安排训练' },
  { value: 'preparing', title: '备孕中', description: '功能开发中', disabled: true },
  { value: 'pregnant', title: '孕期', description: '功能开发中', disabled: true },
  { value: 'postpartum', title: '产后恢复', description: '功能开发中', disabled: true },
];

function getTodayISO() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function createInitialState(): FormState {
  return {
    goal: '',
    level: '',
    height: 165,
    weight: 55,
    weeklyDays: 3,
    sessionMinutes: 30,
    lastPeriodStart: getTodayISO(),
    avgCycleLength: 28,
    status: '',
  };
}

function OptionCard<T extends string>({
  title,
  description,
  selected,
  disabled,
  onSelect,
}: {
  value: T;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'min-h-20 w-full rounded-card border p-4 text-left transition',
        selected
          ? 'border-herfit-primary bg-purple-50 shadow-[0_10px_24px_rgba(139,92,246,0.16)]'
          : 'border-purple-100 bg-white shadow-sm',
        disabled ? 'cursor-not-allowed opacity-70' : 'hover:border-herfit-primaryLight',
      ].join(' ')}
    >
      <span className="block text-base font-semibold text-gray-900">{title}</span>
      <span className={['mt-1 block text-sm', disabled ? 'text-herfit-accent' : 'text-gray-500'].join(' ')}>
        {description}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [form, setForm] = useState<FormState>(() => createInitialState());

  const canContinue = useMemo(() => {
    if (step === 2) return Boolean(form.goal);
    if (step === 3) return Boolean(form.level);
    if (step === 4) return form.height > 0 && form.weight > 0 && form.weeklyDays >= 3 && form.sessionMinutes > 0;
    if (step === 5) return Boolean(form.lastPeriodStart) && form.avgCycleLength > 0;
    if (step === 6) return form.status === 'normal';
    return true;
  }, [form, step]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const goNext = () => {
    if (step >= totalSteps) {
      completeOnboarding();
      return;
    }

    setDirection('forward');
    setStep((current) => Math.min(totalSteps, current + 1));
  };

  const goBack = () => {
    setDirection('back');
    setStep((current) => Math.max(1, current - 1));
  };

  const completeOnboarding = () => {
    if (!form.goal || !form.level || form.status !== 'normal') {
      return;
    }

    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: '她练用户',
      goal: form.goal,
      level: form.level,
      height: form.height,
      weight: form.weight,
      weeklyDays: form.weeklyDays,
      sessionMinutes: form.sessionMinutes,
      preferences: {
        liked: [],
        disliked: [],
      },
      cycle: {
        lastPeriodStart: form.lastPeriodStart,
        avgCycleLength: form.avgCycleLength,
        avgPeriodLength: 5,
      },
      status: form.status,
      createdAt: now,
      onboardingCompleted: true,
    };

    saveProfile(profile);
    router.replace('/');
  };

  const progress = (step / totalSteps) * 100;
  const slideClass =
    direction === 'forward' ? 'animate-[slide-in-forward_240ms_ease-out]' : 'animate-[slide-in-back_240ms_ease-out]';

  return (
    <section className="flex min-h-[calc(100vh-7.5rem)] flex-col">
      <div className="mb-5">
        <p className="text-sm font-medium text-herfit-primaryDark">新用户引导 · {step}/{totalSteps}</p>
      </div>

      <div key={step} className={['flex flex-1 flex-col', slideClass].join(' ')}>
        {step === 1 && (
          <div className="flex flex-1 flex-col justify-center space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-herfit-accent">她练 HerFit</p>
              <h1 className="text-4xl font-bold leading-tight text-gray-900">按你的周期，安排今天的训练</h1>
              <p className="text-base leading-7 text-gray-600">
                她练会结合生理周期、训练目标和当天状态，生成更适合女性身体节奏的自重训练计划。
              </p>
            </div>
            <div className="rounded-card border border-purple-100 bg-white p-5 shadow-sm">
              <p className="text-sm leading-6 text-gray-600">训练建议仅供参考，不替代专业医疗建议。</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">你的训练目标是？</h1>
              <p className="mt-2 text-sm text-gray-500">先选一个最主要的方向。</p>
            </div>
            <div className="space-y-3">
              {goalOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  value={option.value}
                  title={option.title}
                  description={option.description}
                  selected={form.goal === option.value}
                  onSelect={() => updateForm('goal', option.value)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">现在的训练水平？</h1>
              <p className="mt-2 text-sm text-gray-500">她练会据此控制动作难度和训练密度。</p>
            </div>
            <div className="space-y-3">
              {levelOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  value={option.value}
                  title={option.title}
                  description={option.description}
                  selected={form.level === option.value}
                  onSelect={() => updateForm('level', option.value)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">身体数据与偏好</h1>
              <p className="mt-2 text-sm text-gray-500">用于估算训练时长和初始强度。</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-card border border-purple-100 bg-white p-4 shadow-sm">
                <span className="text-sm font-medium text-gray-600">身高 cm</span>
                <input
                  type="number"
                  min="120"
                  max="220"
                  value={form.height}
                  onChange={(event) => updateForm('height', Number(event.target.value))}
                  className="mt-2 min-h-12 w-full rounded-button border border-gray-200 px-3 text-lg font-semibold outline-none focus:border-herfit-primary"
                />
              </label>
              <label className="rounded-card border border-purple-100 bg-white p-4 shadow-sm">
                <span className="text-sm font-medium text-gray-600">体重 kg</span>
                <input
                  type="number"
                  min="35"
                  max="180"
                  value={form.weight}
                  onChange={(event) => updateForm('weight', Number(event.target.value))}
                  className="mt-2 min-h-12 w-full rounded-button border border-gray-200 px-3 text-lg font-semibold outline-none focus:border-herfit-primary"
                />
              </label>
            </div>
            <label className="block rounded-card border border-purple-100 bg-white p-4 shadow-sm">
              <span className="flex items-center justify-between text-sm font-medium text-gray-600">
                <span>每周训练天数</span>
                <span className="text-herfit-primaryDark">{form.weeklyDays} 天</span>
              </span>
              <input
                type="range"
                min="3"
                max="6"
                value={form.weeklyDays}
                onChange={(event) => updateForm('weeklyDays', Number(event.target.value))}
                className="mt-4 w-full accent-herfit-primary"
              />
            </label>
            <label className="block rounded-card border border-purple-100 bg-white p-4 shadow-sm">
              <span className="flex items-center justify-between text-sm font-medium text-gray-600">
                <span>每次训练时长</span>
                <span className="text-herfit-primaryDark">{form.sessionMinutes} 分钟</span>
              </span>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={form.sessionMinutes}
                onChange={(event) => updateForm('sessionMinutes', Number(event.target.value))}
                className="mt-4 w-full accent-herfit-primary"
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">生理周期信息</h1>
              <p className="mt-2 text-sm text-gray-500">用于判断周期阶段和训练强度。</p>
            </div>
            <label className="block rounded-card border border-purple-100 bg-white p-4 shadow-sm">
              <span className="text-sm font-medium text-gray-600">上次月经开始日期</span>
              <input
                type="date"
                value={form.lastPeriodStart}
                onChange={(event) => updateForm('lastPeriodStart', event.target.value)}
                className="mt-2 min-h-12 w-full rounded-button border border-gray-200 px-3 text-base outline-none focus:border-herfit-primary"
              />
            </label>
            <label className="block rounded-card border border-purple-100 bg-white p-4 shadow-sm">
              <span className="flex items-center justify-between text-sm font-medium text-gray-600">
                <span>平均周期天数</span>
                <span className="text-herfit-primaryDark">{form.avgCycleLength} 天</span>
              </span>
              <input
                type="range"
                min="21"
                max="40"
                value={form.avgCycleLength}
                onChange={(event) => updateForm('avgCycleLength', Number(event.target.value))}
                className="mt-4 w-full accent-herfit-primary"
              />
            </label>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">当前状态</h1>
              <p className="mt-2 text-sm text-gray-500">当前版本先支持日常健身场景。</p>
            </div>
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  value={option.value}
                  title={option.title}
                  description={option.description}
                  disabled={option.disabled}
                  selected={form.status === option.value}
                  onSelect={() => updateForm('status', option.value)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="h-2 overflow-hidden rounded-full bg-purple-100">
          <div className="h-full rounded-full bg-herfit-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="min-h-12 rounded-button border border-purple-100 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue}
            className="min-h-12 rounded-button bg-herfit-primary px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(139,92,246,0.24)] transition disabled:cursor-not-allowed disabled:bg-purple-200 disabled:shadow-none"
          >
            {step === totalSteps ? '完成设置' : '继续'}
          </button>
        </div>
      </div>
    </section>
  );
}
