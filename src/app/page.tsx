'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CycleIndicator from '@/components/CycleIndicator';
import FeedbackModal from '@/components/FeedbackModal';
import SceneSelector from '@/components/SceneSelector';
import ScienceCard from '@/components/ScienceCard';
import StatusCheck from '@/components/StatusCheck';
import WorkoutCard from '@/components/WorkoutCard';
import { getCurrentCyclePhaseFromContext, getCycleContext, type CycleInfo } from '@/lib/cycle';
import { adjustDailyWorkout, generateScienceNote, generateWeeklyPlan } from '@/lib/claude';
import { createDefaultWeeklyPlan, isDefaultWeeklyPlan } from '@/lib/defaultWorkout';
import {
  addWorkoutRecord,
  getCurrentPlan,
  getLastActive,
  getLogs,
  getProfile,
  getStreak,
  getUserSettings,
  saveCurrentPlan,
  saveLastActive,
  saveLogs,
  saveStreak,
} from '@/lib/storage';
import type { DailyWorkout, EnergyLevel, Exercise, Scene, UserProfile, WeeklyPlan, WorkoutLog } from '@/lib/types';

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function getTodayWorkout(plan: WeeklyPlan, today: string) {
  return plan.days.find((day) => day.date === today) ?? plan.days[0] ?? null;
}

function clampDuration(minutes: number) {
  return Math.min(35, Math.max(20, Math.round(minutes)));
}

const highImpactPattern = /波比|burpee|深蹲跳|开合跳|跳跃弓步|跳跃|jump/i;

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
    scienceNote: workout.scienceNote.length > 72 ? `${workout.scienceNote.slice(0, 71)}…` : workout.scienceNote,
  };
}

function isUsableTodayPlan(plan: WeeklyPlan | null, today: string) {
  return Boolean(plan && getTodayWorkout(plan, today));
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
      <div className="h-48 animate-pulse rounded-card bg-white" />
      <div className="h-28 animate-pulse rounded-card bg-white" />
    </section>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-card border border-orange-100 bg-orange-50 p-5">
      <h2 className="text-lg font-bold text-gray-900">计划生成遇到一点问题</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-12 w-full rounded-button bg-herfit-accent px-4 text-sm font-semibold text-white">
        重试
      </button>
    </section>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const today = useMemo(() => getTodayISO(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [baseWorkout, setBaseWorkout] = useState<DailyWorkout | null>(null);
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [scienceLoading, setScienceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [usingDefaultPlan, setUsingDefaultPlan] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showReturnCard, setShowReturnCard] = useState(false);

  const loadPlan = useCallback(
    async (activeProfile: UserProfile, activeCycleInfo: CycleInfo, forceRefresh = false) => {
      setLoadingPlan(true);
      setError(null);

      try {
        const storedPlan = forceRefresh ? null : getCurrentPlan();
        const cachedPlan = isUsableTodayPlan(storedPlan, today) ? storedPlan : null;
        const nextPlan = cachedPlan ?? (await generateWeeklyPlan(activeProfile, activeCycleInfo, getLogs()));

        if (!cachedPlan) {
          saveCurrentPlan(nextPlan);
        }

        const rawWorkout = getTodayWorkout(nextPlan, today);

        if (!rawWorkout) {
          throw new Error('今天暂无训练计划，请重试生成。');
        }

        const nextWorkout = sanitizeWorkoutForCycle(rawWorkout, activeCycleInfo);
        const sanitizedPlan = {
          ...nextPlan,
          days: nextPlan.days.map((day) => (day.date === rawWorkout.date ? nextWorkout : day)),
        };

        saveCurrentPlan(sanitizedPlan);
        setPlan(sanitizedPlan);
        setBaseWorkout(nextWorkout);
        setWorkout(nextWorkout);
        setUsingDefaultPlan(isDefaultWeeklyPlan(sanitizedPlan));
      } catch (loadError) {
        console.error('loadPlan failed, showing default workout:', loadError);
        const fallbackPlan = createDefaultWeeklyPlan(activeCycleInfo, today);
        const fallbackWorkout = getTodayWorkout(fallbackPlan, today);

        saveCurrentPlan(fallbackPlan);
        setPlan(fallbackPlan);
        setBaseWorkout(fallbackWorkout);
        setWorkout(fallbackWorkout);
        setUsingDefaultPlan(true);
        setError(null);
      } finally {
        setLoadingPlan(false);
      }
    },
    [today],
  );

  useEffect(() => {
    const storedProfile = getProfile();
    const settings = getUserSettings();

    if (!storedProfile || !storedProfile.onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    const nextCycleInfo = getCurrentCyclePhaseFromContext(getCycleContext(settings, today));

    const lastActive = getLastActive();
    setShowReturnCard(Boolean(lastActive && getDaysBetween(lastActive, today) > 1));
    setProfile(storedProfile);
    setCycleInfo(nextCycleInfo);
    void loadPlan(storedProfile, nextCycleInfo);
  }, [loadPlan, router, today]);

  useEffect(() => {
    if (!baseWorkout || !energyLevel || !scene || !cycleInfo) {
      return;
    }

    let cancelled = false;
    const activeWorkout = baseWorkout;
    const activeEnergyLevel = energyLevel;
    const activeScene = scene;
    const activePhase = cycleInfo.phase;

    async function applyAdjustment() {
      setAdjusting(true);
      setAdjustError(null);

      try {
        const adjusted = await adjustDailyWorkout(activeWorkout, activeEnergyLevel, activeScene, activePhase);

        if (!cancelled) {
          setWorkout(adjusted);
        }
      } catch (adjustmentError) {
        if (!cancelled) {
          setAdjustError(adjustmentError instanceof Error ? adjustmentError.message : '今日计划微调失败，已保留原计划。');
          setWorkout({
            ...activeWorkout,
            energyLevel: activeEnergyLevel,
            scene: activeScene,
          });
        }
      } finally {
        if (!cancelled) {
          setAdjusting(false);
        }
      }
    }

    void applyAdjustment();

    return () => {
      cancelled = true;
    };
  }, [baseWorkout, cycleInfo, energyLevel, scene]);

  useEffect(() => {
    if (!workout || workout.scienceNote || !cycleInfo || !energyLevel || !scene) {
      return;
    }

    let cancelled = false;
    const activeWorkout = workout;
    const activePhase = cycleInfo.phase;

    async function loadScienceNote() {
      setScienceLoading(true);

      try {
        const note = await generateScienceNote(activePhase, activeWorkout);

        if (!cancelled) {
          setWorkout((current) => (current ? { ...current, scienceNote: note } : current));
        }
      } catch {
        if (!cancelled) {
          setWorkout((current) =>
            current
              ? {
                  ...current,
                  scienceNote: '今天的训练会根据你的周期阶段和状态调整强度，目标是安全、稳定地完成，而不是硬撑。',
                }
              : current,
          );
        }
      } finally {
        if (!cancelled) {
          setScienceLoading(false);
        }
      }
    }

    void loadScienceNote();

    return () => {
      cancelled = true;
    };
  }, [cycleInfo, energyLevel, scene, workout]);

  const showPeriodRest = cycleInfo?.phase === 'menstrual' && cycleInfo.dayInCycle <= 3;
  const readyForWorkout = Boolean(energyLevel && scene && workout);
  const returnMessage = getReturnMessage(profile?.name ?? '');

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
  };

  if (!profile || !cycleInfo || loadingPlan) {
    return <LoadingSkeleton />;
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-herfit-primaryDark">今日训练</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">今天，温柔地动起来</h1>
      </div>

      {error ? <ErrorCard message={error} onRetry={() => void loadPlan(profile, cycleInfo, true)} /> : null}

      {!error ? (
        <>
          {showReturnCard ? (
            <section className="rounded-card border border-orange-100 bg-orange-50 p-4">
              <h2 className="text-lg font-bold text-gray-900">{returnMessage.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{returnMessage.body}</p>
            </section>
          ) : null}

          <CycleIndicator cycleInfo={cycleInfo} />

          {usingDefaultPlan ? (
            <section className="rounded-card border border-orange-100 bg-orange-50 p-4">
              <h2 className="text-base font-bold text-gray-900">已为你加载默认训练计划</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">AI 计划暂时不可用，先用安全的基础训练开始，等网络稳定后可以重新生成。</p>
            </section>
          ) : null}

          {!energyLevel ? <StatusCheck value={energyLevel} onChange={setEnergyLevel} /> : null}
          {energyLevel && !scene ? <SceneSelector value={scene} showPeriodRest={Boolean(showPeriodRest)} onChange={setScene} /> : null}

          {adjustError ? <div className="rounded-button bg-orange-50 p-3 text-sm text-herfit-accent">{adjustError}</div> : null}

          {readyForWorkout && workout ? (
            <>
              <WorkoutCard workout={workout} isAdjusting={adjusting} />
              <ScienceCard content={workout.scienceNote} nutritionTip={workout.nutritionTip} loading={scienceLoading} />
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="min-h-12 w-full rounded-button bg-herfit-accent px-4 text-base font-semibold text-white shadow-[0_12px_24px_rgba(249,115,22,0.22)]"
              >
                完成训练
              </button>
            </>
          ) : null}
        </>
      ) : null}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSubmit={handleFeedback} />
    </section>
  );
}
