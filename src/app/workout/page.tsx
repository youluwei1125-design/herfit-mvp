'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import FeedbackModal from '@/components/FeedbackModal';
import ScienceCard from '@/components/ScienceCard';
import WorkoutCard from '@/components/WorkoutCard';
import { getCurrentCyclePhaseFromContext, getCycleContext } from '@/lib/cycle';
import { createDefaultWeeklyPlan, isDefaultWeeklyPlan } from '@/lib/defaultWorkout';
import {
  addWorkoutRecord,
  getCurrentWorkoutCache,
  getLogs,
  getProfile,
  getSelectedEnergyLevel,
  getStreak,
  getUserSettings,
  saveCurrentWorkoutCache,
  saveLastActive,
  saveLogs,
  saveStreak,
} from '@/lib/storage';
import type { CyclePhase, DailyWorkout, EnergyLevel, WeeklyPlan, WorkoutLog } from '@/lib/types';

const phaseLabels: Record<CyclePhase, string> = {
  menstrual: '月经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期',
};

const energyLabels: Record<EnergyLevel, string> = {
  high: '精力充沛',
  medium: '一般',
  low: '很累',
};

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayWorkout(plan: WeeklyPlan, today: string) {
  return plan.days.find((day) => day.date === today) ?? plan.days[0] ?? null;
}

function buildWorkoutCacheSignature(
  date: string,
  cycleContext: ReturnType<typeof getCycleContext>,
  energyLevel: EnergyLevel,
  trainingPreference: ReturnType<typeof getUserSettings>['trainingPreference'],
) {
  return JSON.stringify({
    date,
    currentPhase: cycleContext.currentPhase,
    cycleDay: cycleContext.cycleDay,
    phaseDay: cycleContext.phaseDay,
    energyLevel,
    trainingPreference,
    cycleLength: cycleContext.cycleLength,
    periodLength: cycleContext.periodLength,
  });
}

function createFallbackCache(today: string) {
  const settings = getUserSettings();
  const cycleContext = getCycleContext(settings, today);
  const cycleInfo = getCurrentCyclePhaseFromContext(cycleContext);
  const energyLevel = getSelectedEnergyLevel() ?? 'medium';
  const fallbackPlan = createDefaultWeeklyPlan(cycleInfo, today, energyLevel, settings.trainingPreference);
  const signature = buildWorkoutCacheSignature(today, cycleContext, energyLevel, settings.trainingPreference);

  saveCurrentWorkoutCache({
    signature,
    plan: fallbackPlan,
  });

  return {
    plan: fallbackPlan,
    isFallback: true,
  };
}

export default function WorkoutPage() {
  const router = useRouter();
  const today = useMemo(() => getTodayISO(), []);
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const profile = getProfile();
    if (!profile?.onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    const cachedPlan = getCurrentWorkoutCache()?.plan;
    const plan = cachedPlan ?? createFallbackCache(today).plan;
    const nextWorkout = getTodayWorkout(plan, today);

    if (!nextWorkout) {
      const fallback = createFallbackCache(today);
      setWorkout(getTodayWorkout(fallback.plan, today));
      setIsFallback(true);
      return;
    }

    setWorkout(nextWorkout);
    setIsFallback(isDefaultWeeklyPlan(plan));
  }, [router, today]);

  const handleFeedback = (feedback: WorkoutLog['feedback'], notes?: string) => {
    if (!workout) {
      return;
    }

    const currentLogs = getLogs();
    const completed = feedback !== 'skipped';
    const nextLogs = [
      ...currentLogs.filter((log) => log.date !== today),
      {
        date: today,
        workoutId: `${workout.date}_${workout.theme}`,
        completed,
        feedback,
        notes,
      },
    ];

    saveLogs(nextLogs);
    addWorkoutRecord({
      id: `${today}_${workout.theme}`,
      date: today,
      cyclePhase: workout.cyclePhase,
      cycleDay: workout.cycleDay,
      workoutName: workout.theme,
      duration: workout.estimatedMinutes,
      energyLevel: workout.energyLevel,
      feedback,
      notes,
      completedAt: new Date().toISOString(),
    });
    saveLastActive(today);

    if (completed) {
      saveStreak(getStreak() + 1);
    }

    window.setTimeout(() => router.push('/history'), 900);
  };

  if (!workout) {
    return (
      <section className="space-y-4">
        <div className="h-16 animate-pulse rounded-card bg-purple-50" />
        <div className="h-64 animate-pulse rounded-card bg-white" />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="min-h-10 rounded-button bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm"
      >
        ← 返回今日训练
      </button>

      {isFallback ? (
        <p className="rounded-button bg-orange-50 px-3 py-2 text-xs font-medium text-herfit-accent">
          已为你加载安全默认计划，AI 计划暂时不可用。
        </p>
      ) : null}

      <section className="rounded-card bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-herfit-primaryDark">今日训练</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{workout.theme}</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
          <p className="rounded-button bg-purple-50 p-3">
            {phaseLabels[workout.cyclePhase]} 第{workout.cycleDay}天
          </p>
          <p className="rounded-button bg-orange-50 p-3">
            {energyLabels[workout.energyLevel]} · {workout.estimatedMinutes}分钟
          </p>
        </div>
      </section>

      <WorkoutCard workout={workout} />
      <ScienceCard content={workout.scienceNote} nutritionTip={workout.nutritionTip} />

      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        className="min-h-12 w-full rounded-button bg-herfit-accent px-4 text-base font-semibold text-white shadow-[0_12px_24px_rgba(249,115,22,0.22)]"
      >
        完成训练
      </button>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={handleFeedback} />
    </section>
  );
}
