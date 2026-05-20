import type { CycleInfo } from './cycle';
import { createDefaultWeeklyPlan } from './defaultWorkout';
import {
  buildDailyAdjustUserPrompt,
  buildScienceNoteUserPrompt,
  buildWeeklyPlanUserPrompt,
  DAILY_ADJUST_SYSTEM_PROMPT,
  SCIENCE_NOTE_SYSTEM_PROMPT,
  WEEKLY_PLAN_SYSTEM_PROMPT,
} from './prompts';
import type {
  CycleContext,
  CyclePhase,
  DailyWorkout,
  EnergyLevel,
  Exercise,
  Scene,
  UserProfile,
  UserSettings,
  WeeklyPlan,
  WorkoutLog,
} from './types';

interface ChatResponse {
  text: string;
}

interface ScienceNoteResponse {
  title?: string;
  content?: string;
  nutritionTip?: string;
}

type TodayPlanResponse = Partial<DailyWorkout> | Partial<WeeklyPlan>;

const RETRY_COUNT = 1;
const CLAUDE_REQUEST_TIMEOUT_MS = 15_000;
const isDev = process.env.NODE_ENV !== 'production';
const HIGH_IMPACT_PATTERN = /波比|burpee|深蹲跳|开合跳|跳跃弓步|跳跃|jump/i;

type WorkoutPlanAlias = Partial<DailyWorkout> & {
  title?: string;
  subtitle?: string;
  duration?: number | string;
  tips?: string[] | string;
  exercises?: Array<Partial<Exercise> & { duration?: string; description?: string }>;
};

function logDevError(message: string, details: unknown) {
  if (isDev) {
    console.error(message, details);
  }
}

function extractMarkdownJSONBlock(text: string) {
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match = codeBlockRegex.exec(text);

  while (match) {
    const candidate = match[1]?.trim();

    if (candidate?.includes('{')) {
      return candidate;
    }

    match = codeBlockRegex.exec(text);
  }

  return null;
}

function extractFirstJSONObject(text: string) {
  const start = text.indexOf('{');

  if (start === -1) {
    return text.trim();
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1).trim();
      }
    }
  }

  const end = text.lastIndexOf('}');
  return end > start ? text.slice(start, end + 1).trim() : text.slice(start).trim();
}

export function safeParseJSON<T = unknown>(text: string): T {
  const blockJSON = extractMarkdownJSONBlock(text);
  let cleaned = (blockJSON ?? text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned.startsWith('{')) {
    cleaned = extractFirstJSONObject(cleaned);
  }

  if (!cleaned.endsWith('}')) {
    cleaned = extractFirstJSONObject(cleaned);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    logDevError('safeParseJSON failed:', {
      error,
      cleanedText: cleaned,
      originalText: text,
    });

    const jsonObject = extractFirstJSONObject(cleaned);

    if (jsonObject !== cleaned) {
      try {
        return JSON.parse(jsonObject) as T;
      } catch (fallbackError) {
        logDevError('safeParseJSON fallback failed:', {
          error: fallbackError,
          jsonSlice: jsonObject,
        });
      }
    }

    throw new Error('AI 返回格式异常，请重试');
  }
}

export function generateVideoUrl(
  keywords: string,
  platform: 'bilibili' | 'xiaohongshu' | 'youtube' = 'bilibili',
): string {
  const encodedKeywords = encodeURIComponent(keywords);

  switch (platform) {
    case 'bilibili':
      return `https://search.bilibili.com/all?keyword=${encodedKeywords}`;
    case 'xiaohongshu':
      return `https://www.xiaohongshu.com/search_result?keyword=${encodedKeywords}`;
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encodedKeywords}`;
  }
}

async function retry<T>(operation: () => Promise<T>, retries = RETRY_COUNT): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      throw error instanceof Error ? error : new Error('AI 调用失败，请稍后重试');
    }

    return retry(operation, retries - 1);
  }
}

async function callClaude(systemPrompt: string, userPrompt: string, temperature = 0.4): Promise<string> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CLAUDE_REQUEST_TIMEOUT_MS);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature,
    }),
  }).finally(() => window.clearTimeout(timeoutId));

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error ?? 'AI 服务暂时不可用，请稍后重试');
  }

  const data = (await response.json()) as ChatResponse;

  if (!data.text) {
    throw new Error('AI 返回为空，请重试');
  }

  console.log('Claude raw response:', data.text);

  return data.text;
}

function normalizeExercise(exercise: Partial<Exercise> & { isContraindicated?: boolean; duration?: string; description?: string }, index: number): Exercise {
  return {
    id: exercise.id ?? `exercise_${String(index + 1).padStart(3, '0')}`,
    name: exercise.name ?? '自重训练动作',
    muscleGroups: exercise.muscleGroups ?? [],
    sets: exercise.sets ?? 1,
    reps: exercise.reps ?? exercise.duration ?? '按舒适程度',
    tips: exercise.tips ?? (exercise.description ? [exercise.description] : []),
    contraindications:
      exercise.contraindications ?? (exercise.isContraindicated ? ['经期谨慎或避免'] : []),
  };
}

function parseDuration(duration: number | string | undefined, fallback: number) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration;
  }

  if (typeof duration === 'string') {
    const match = duration.match(/\d+/);
    return match ? Number(match[0]) : fallback;
  }

  return fallback;
}

function clampDuration(minutes: number) {
  return Math.min(35, Math.max(8, Math.round(minutes)));
}

function shortenText(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function normalizeDailyWorkout(workout: WorkoutPlanAlias): DailyWorkout {
  const theme = workout.theme ?? workout.title ?? '今日训练';
  const videoKeywords = workout.videoKeywords ?? `${theme} 无器械`;

  return {
    date: workout.date ?? new Date().toISOString().slice(0, 10),
    cyclePhase: workout.cyclePhase ?? 'follicular',
    cycleDay: workout.cycleDay ?? 1,
    scene: workout.scene ?? 'home',
    energyLevel: workout.energyLevel ?? 'medium',
    theme,
    exercises: (workout.exercises ?? []).map(normalizeExercise),
    estimatedMinutes: clampDuration(workout.estimatedMinutes ?? parseDuration(workout.duration, 20)),
    videoKeywords,
    videoUrl: workout.videoUrl || generateVideoUrl(videoKeywords),
    scienceNote: shortenText(workout.scienceNote ?? workout.subtitle ?? '', 72),
    nutritionTip: workout.nutritionTip ?? (Array.isArray(workout.tips) ? workout.tips.join(' ') : workout.tips ?? ''),
  };
}

function createLowImpactReplacement(index: number): Exercise {
  return {
    id: `ovulation_low_impact_${index + 1}`,
    name: '低冲击登山步',
    muscleGroups: ['核心', '肩部稳定', '心肺'],
    sets: 3,
    reps: '30秒',
    tips: ['双手撑稳，肩膀远离耳朵', '交替迈步，不做跳跃', '保持核心收紧和自然呼吸'],
    contraindications: [],
  };
}

function enforceWorkoutRules(workout: DailyWorkout, cycleInfo: CycleInfo): DailyWorkout {
  const exercises =
    cycleInfo.phase === 'ovulation'
      ? workout.exercises.map((exercise, index) =>
          HIGH_IMPACT_PATTERN.test(exercise.name) ? createLowImpactReplacement(index) : exercise,
        )
      : workout.exercises;

  return {
    ...workout,
    cyclePhase: cycleInfo.phase,
    cycleDay: cycleInfo.dayInCycle,
    exercises,
    estimatedMinutes: clampDuration(workout.estimatedMinutes),
    scienceNote: shortenText(workout.scienceNote, 72),
  };
}

function normalizeWeeklyPlan(plan: Partial<WeeklyPlan>): WeeklyPlan {
  return {
    weekStart: plan.weekStart ?? new Date().toISOString().slice(0, 10),
    days: (plan.days ?? []).map(normalizeDailyWorkout),
    generatedAt: plan.generatedAt ?? new Date().toISOString(),
  };
}

function wrapDailyWorkoutAsPlan(workout: DailyWorkout): WeeklyPlan {
  return {
    weekStart: workout.date,
    days: [workout],
    generatedAt: new Date().toISOString(),
  };
}

function hasWorkoutDays(plan: TodayPlanResponse): plan is Partial<WeeklyPlan> {
  return 'days' in plan;
}

function validateWorkoutPlan(workout: DailyWorkout): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!workout.theme) reasons.push('missing title/theme');
  if (!workout.scienceNote && !workout.nutritionTip) reasons.push('missing subtitle/scienceNote/nutritionTip');
  if (!workout.estimatedMinutes || workout.estimatedMinutes <= 0) reasons.push('missing duration/estimatedMinutes');
  if (!Array.isArray(workout.exercises)) reasons.push('exercises is not an array');
  if (Array.isArray(workout.exercises) && workout.exercises.length === 0) reasons.push('exercises is empty');

  workout.exercises.forEach((exercise, index) => {
    if (!exercise.name) reasons.push(`exercise[${index}] missing name`);
    if (!exercise.sets && !exercise.reps) reasons.push(`exercise[${index}] missing sets or duration/reps`);
    if (!exercise.tips?.length) reasons.push(`exercise[${index}] missing description/tips`);
  });

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

function validateWorkoutMatchesInputs(workout: DailyWorkout, cycleInfo: CycleInfo, energyLevel: EnergyLevel) {
  const reasons: string[] = [];
  const theme = workout.theme;

  if (workout.energyLevel !== energyLevel) {
    reasons.push(`energyLevel mismatch: expected ${energyLevel}, got ${workout.energyLevel}`);
  }

  if (/上肢推拉\s*\+\s*核心稳定|上肢推\s*\+\s*核心/.test(theme)) {
    reasons.push('theme is stale generic cached title');
  }

  if (cycleInfo.phase === 'menstrual' && energyLevel === 'high') {
    if (workout.estimatedMinutes < 15 || workout.exercises.length === 0 || !/(轻量|活动|低冲击|唤醒)/.test(theme)) {
      reasons.push('menstrual high plan should be light activity with low-impact exercises');
    }
  }

  if (cycleInfo.phase === 'follicular' && energyLevel === 'medium' && !/(全身|基础|力量|激活)/.test(theme)) {
    reasons.push('follicular medium plan should focus on full-body activation or basic strength');
  }

  if (cycleInfo.phase === 'ovulation' && !/(稳定|控制|中等|力量|核心)/.test(theme)) {
    reasons.push('ovulation plan should focus on stability, control, or medium strength');
  }

  if (cycleInfo.phase === 'luteal' && !/(低冲击|稳态|舒缓|控制|力量)/.test(theme)) {
    reasons.push('luteal plan should focus on low-impact or steady strength');
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

function fallbackPlan(cycleInfo: CycleInfo, reason: unknown, energyLevel: EnergyLevel = 'medium', settings?: UserSettings) {
  logDevError('Using default workout fallback:', reason);
  return createDefaultWeeklyPlan(cycleInfo, new Date().toISOString().slice(0, 10), energyLevel, settings?.trainingPreference ?? 'standard');
}

export async function generateWeeklyPlan(
  profile: UserProfile,
  cycleInfo: CycleInfo,
  previousLogs: WorkoutLog[],
  cycleContext?: CycleContext,
  settings?: UserSettings,
  energyLevel: EnergyLevel = 'medium',
): Promise<WeeklyPlan> {
  const userPrompt = buildWeeklyPlanUserPrompt(profile, cycleInfo, previousLogs, cycleContext, settings, energyLevel);

  try {
    return await retry(async () => {
      const text = await callClaude(WEEKLY_PLAN_SYSTEM_PROMPT, userPrompt, 0.4);
      const parsed = safeParseJSON<TodayPlanResponse>(text);

      if (hasWorkoutDays(parsed)) {
        const rawPlan = normalizeWeeklyPlan({
          ...parsed,
          days: parsed.days?.slice(0, 1),
        });
        const plan = {
          ...rawPlan,
          days: rawPlan.days.map((day) => enforceWorkoutRules(day, cycleInfo)),
        };
        const workout = plan.days[0];
        const validation = workout
          ? validateWorkoutPlan(workout)
          : { valid: false, reasons: ['weekly plan missing first daily workout'] };

        if (!validation.valid) {
          logDevError('validateWorkoutPlan failed:', validation.reasons);
          return fallbackPlan(cycleInfo, validation.reasons, energyLevel, settings);
        }

        const inputValidation = validateWorkoutMatchesInputs(workout, cycleInfo, energyLevel);
        if (!inputValidation.valid) {
          logDevError('validateWorkoutMatchesInputs failed:', inputValidation.reasons);
          return fallbackPlan(cycleInfo, inputValidation.reasons, energyLevel, settings);
        }

        return plan;
      }

      const workout = enforceWorkoutRules(normalizeDailyWorkout(parsed as WorkoutPlanAlias), cycleInfo);
      const validation = validateWorkoutPlan(workout);

      if (!validation.valid) {
        logDevError('validateWorkoutPlan failed:', validation.reasons);
        return fallbackPlan(cycleInfo, validation.reasons, energyLevel, settings);
      }

      const inputValidation = validateWorkoutMatchesInputs(workout, cycleInfo, energyLevel);
      if (!inputValidation.valid) {
        logDevError('validateWorkoutMatchesInputs failed:', inputValidation.reasons);
        return fallbackPlan(cycleInfo, inputValidation.reasons, energyLevel, settings);
      }

      return wrapDailyWorkoutAsPlan(workout);
    });
  } catch (error) {
    return fallbackPlan(cycleInfo, error, energyLevel, settings);
  }
}

export async function adjustDailyWorkout(
  originalWorkout: DailyWorkout,
  energyLevel: EnergyLevel,
  scene: Scene,
  cyclePhase: CyclePhase,
): Promise<DailyWorkout> {
  if (energyLevel === 'medium' && scene === 'home') {
    return originalWorkout;
  }

  const userPrompt = buildDailyAdjustUserPrompt(originalWorkout, energyLevel, scene, cyclePhase);

  return retry(async () => {
    const text = await callClaude(DAILY_ADJUST_SYSTEM_PROMPT, userPrompt, 0.35);
    const parsed = safeParseJSON<Partial<DailyWorkout>>(text);
    return enforceWorkoutRules(normalizeDailyWorkout({
      ...originalWorkout,
      ...parsed,
      energyLevel,
      scene,
      cyclePhase,
    }), {
      phase: cyclePhase,
      dayInCycle: originalWorkout.cycleDay,
      daysUntilNextPhase: 0,
      phaseDescription: '',
    });
  });
}

export async function generateScienceNote(
  cyclePhase: CyclePhase,
  todayWorkout: DailyWorkout,
): Promise<string> {
  const userPrompt = buildScienceNoteUserPrompt(cyclePhase, todayWorkout);

  return retry(async () => {
    const text = await callClaude(SCIENCE_NOTE_SYSTEM_PROMPT, userPrompt, 0.65);
    const parsed = safeParseJSON<ScienceNoteResponse>(text);
    return shortenText([parsed.title, parsed.content].filter(Boolean).join('\n') || todayWorkout.scienceNote, 72);
  });
}
