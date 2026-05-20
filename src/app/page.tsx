'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CycleIndicator from '@/components/CycleIndicator';
import StatusCheck from '@/components/StatusCheck';
import { getCurrentCyclePhaseFromContext, getCycleContext, type CycleInfo } from '@/lib/cycle';
import { generateWeeklyPlan } from '@/lib/claude';
import { createDefaultWeeklyPlan, isDefaultWeeklyPlan } from '@/lib/defaultWorkout';
import {
  clearCurrentWorkoutCache,
  getCurrentWorkoutCache,
  getLastActive,
  getLogs,
  getProfile,
  getUserSettings,
  saveCurrentWorkoutCache,
  saveSelectedEnergyLevel,
} from '@/lib/storage';
import type { CycleContext, DailyWorkout, EnergyLevel, Exercise, UserProfile, UserSettings, WeeklyPlan } from '@/lib/types';

const PLAN_GENERATION_TIMEOUT_MS = 16_000;
const highImpactPattern = /波比|burpee|深蹲跳|开合跳|跳跃弓步|跳跃|jump/i;

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysBetween(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const startUTC = Date.UTC(startYear, startMonth - 1, startDay);
  const endUTC = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((endUTC - startUTC) / (24 * 60 * 60 * 1000));
}

function getTodayWorkout(plan: WeeklyPlan, today: string) {
  return plan.days.find((day) => day.date === today) ?? plan.days[0] ?? null;
}

function clampDuration(minutes: number) {
  return Math.min(35, Math.max(8, Math.round(minutes)));
}

function lowImpactReplacement(index: number): Exercise {
  return {
    id: `cached_ovulation_low_${index + 1}`,
    name: '低冲击登山步',
    muscleGroups: ['核心', '肩部稳定', '心肺'],
    sets: 3,
    reps: '30秒',
    tips: ['双手撑稳，肩膀远离耳朵', '交替迈步，不做跳跃', '保持核心收紧和自然呼吸'],
    contraindications: [],
  };
}

function sanitizeWorkoutForCycle(workout: DailyWorkout, cycleInfo: CycleInfo): DailyWorkout {
  const exercises =
    cycleInfo.phase === 'ovulation'
      ? workout.exercises.map((exercise, index) =>
          highImpactPattern.test(exercise.name) ? lowImpactReplacement(index) : exercise,
        )
      : workout.exercises;

  return {
    ...workout,
    cyclePhase: cycleInfo.phase,
    cycleDay: cycleInfo.dayInCycle,
    exercises,
    estimatedMinutes: clampDuration(workout.estimatedMinutes),
    scienceNote: workout.scienceNote.length > 72 ? `${workout.scienceNote.slice(0, 71)}...` : workout.scienceNote,
  };
}

function isUsableTodayPlan(plan: WeeklyPlan | null, today: string) {
  return Boolean(plan && getTodayWorkout(plan, today));
}

function buildWorkoutCacheSignature(
  date: string,
  cycleContext: CycleContext,
  energyLevel: EnergyLevel,
  trainingPreference: UserSettings['trainingPreference'],
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function getReturnMessage(name: string) {
  return {
    title: `${name || '欢迎'}，回来就好`,
    body: '今天是新的开始，计划已经自动放轻到适合重新进入节奏的版本。先做一点点，也是在认真照顾自己。',
  };
}

function LoadingSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-24 animate-pulse rounded-card bg-purple-50" />
      <div className="h-24 animate-pulse rounded-card bg-white" />
    </section>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const today = useMemo(() => getTodayISO(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [cycleContext, setCycleContext] = useState<CycleContext | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [usingDefaultPlan, setUsingDefaultPlan] = useState(false);
  const [showReturnCard, setShowReturnCard] = useState(false);
  const generationIdRef = useRef(0);

  const saveFallbackAndNavigate = useCallback(
    (
      activeCycleInfo: CycleInfo,
      activeSettings: UserSettings,
      activeEnergyLevel: EnergyLevel,
      workoutCacheSignature: string,
      reason: unknown,
    ) => {
      console.error('HerFit using fallback workout:', reason);
      const fallbackPlan = createDefaultWeeklyPlan(
        activeCycleInfo,
        today,
        activeEnergyLevel,
        activeSettings.trainingPreference,
      );

      saveCurrentWorkoutCache({
        signature: workoutCacheSignature,
        plan: fallbackPlan,
      });
      setUsingDefaultPlan(true);

      if (process.env.NODE_ENV === 'development') {
        console.log('HerFit final workout plan:', {
          source: 'fallback',
          title: fallbackPlan.days[0]?.theme,
        });
      }

      router.push('/workout');
    },
    [router, today],
  );

  const generatePlanAndNavigate = useCallback(
    async (
      activeProfile: UserProfile,
      activeCycleInfo: CycleInfo,
      activeCycleContext: CycleContext,
      activeSettings: UserSettings,
      activeEnergyLevel: EnergyLevel,
    ) => {
      const generationId = generationIdRef.current + 1;
      generationIdRef.current = generationId;
      setLoadingPlan(true);

      const workoutCacheSignature = buildWorkoutCacheSignature(
        today,
        activeCycleContext,
        activeEnergyLevel,
        activeSettings.trainingPreference,
      );

      try {
        const cachedWorkout = getCurrentWorkoutCache();
        const cacheHit = Boolean(
          cachedWorkout?.signature === workoutCacheSignature && isUsableTodayPlan(cachedWorkout.plan, today),
        );

        if (!cacheHit) {
          clearCurrentWorkoutCache();
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('HerFit workout generation inputs:', {
            cycleContext: activeCycleContext,
            selectedEnergyLevel: activeEnergyLevel,
            trainingPreference: activeSettings.trainingPreference,
            workoutCacheSignature,
            cacheHit,
          });
        }

        const nextPlan =
          (cacheHit ? cachedWorkout?.plan ?? null : null) ??
          (await withTimeout(
            generateWeeklyPlan(
              activeProfile,
              activeCycleInfo,
              getLogs(),
              activeCycleContext,
              activeSettings,
              activeEnergyLevel,
            ),
            PLAN_GENERATION_TIMEOUT_MS,
            '训练计划生成超时，已切换到默认计划',
          ));

        if (generationId !== generationIdRef.current) {
          return;
        }

        const rawWorkout = getTodayWorkout(nextPlan, today);
        if (!rawWorkout) {
          throw new Error('训练计划为空，已切换到默认计划');
        }

        const nextWorkout = sanitizeWorkoutForCycle(rawWorkout, activeCycleInfo);
        const sanitizedPlan = {
          ...nextPlan,
          days: nextPlan.days.map((day) =>
            day.date === rawWorkout.date
              ? {
                  ...nextWorkout,
                  energyLevel: activeEnergyLevel,
                }
              : day,
          ),
        };

        saveCurrentWorkoutCache({
          signature: workoutCacheSignature,
          plan: sanitizedPlan,
        });
        setUsingDefaultPlan(isDefaultWeeklyPlan(sanitizedPlan));

        if (process.env.NODE_ENV === 'development') {
          console.log('HerFit final workout plan:', {
            source: isDefaultWeeklyPlan(sanitizedPlan) ? 'fallback' : cacheHit ? 'cache' : 'AI',
            title: sanitizedPlan.days[0]?.theme,
          });
        }

        router.push('/workout');
      } catch (error) {
        if (generationId !== generationIdRef.current) {
          return;
        }

        saveFallbackAndNavigate(activeCycleInfo, activeSettings, activeEnergyLevel, workoutCacheSignature, error);
      } finally {
        if (generationId === generationIdRef.current) {
          setLoadingPlan(false);
        }
      }
    },
    [router, saveFallbackAndNavigate, today],
  );

  useEffect(() => {
    const storedProfile = getProfile();
    const settings = getUserSettings();

    if (!storedProfile || !storedProfile.onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    const nextCycleContext = getCycleContext(settings, today);
    const nextCycleInfo = getCurrentCyclePhaseFromContext(nextCycleContext);

    const lastActive = getLastActive();
    setShowReturnCard(Boolean(lastActive && getDaysBetween(lastActive, today) > 1));
    setProfile(storedProfile);
    setCycleInfo(nextCycleInfo);
    setCycleContext(nextCycleContext);
    setUserSettings(settings);
    setLoadingPlan(false);
  }, [router, today]);

  const handleEnergyLevelChange = useCallback(
    (nextEnergyLevel: EnergyLevel) => {
      if (!profile || !cycleInfo || !cycleContext || !userSettings) {
        return;
      }

      saveSelectedEnergyLevel(nextEnergyLevel);
      setEnergyLevel(nextEnergyLevel);
      setUsingDefaultPlan(false);
      void generatePlanAndNavigate(profile, cycleInfo, cycleContext, userSettings, nextEnergyLevel);
    },
    [cycleContext, cycleInfo, generatePlanAndNavigate, profile, userSettings],
  );

  if (!profile || !cycleInfo) {
    return <LoadingSkeleton />;
  }

  const returnMessage = getReturnMessage(profile.name);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-herfit-primaryDark">今日训练</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">今天，温柔地动起来</h1>
      </div>

      {showReturnCard ? (
        <section className="rounded-card border border-orange-100 bg-orange-50 p-4">
          <h2 className="text-lg font-bold text-gray-900">{returnMessage.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{returnMessage.body}</p>
        </section>
      ) : null}

      <CycleIndicator cycleInfo={cycleInfo} />

      {usingDefaultPlan ? (
        <p className="rounded-button bg-orange-50 px-3 py-2 text-xs font-medium text-herfit-accent">
          AI 计划暂时不可用，已准备安全默认计划。
        </p>
      ) : null}

      <StatusCheck value={energyLevel} onChange={handleEnergyLevelChange} />
      {loadingPlan ? <LoadingSkeleton /> : null}
    </section>
  );
}
