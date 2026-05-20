import type { CycleContext, CyclePhase, UserSettings } from './types';

export interface CycleInfo {
  phase: CyclePhase;
  dayInCycle: number;
  daysUntilNextPhase: number;
  phaseDescription: string;
}

interface PhaseTrainingMeta {
  intensityRange: 'low' | 'medium' | 'high';
  recommendedTypes: string[];
  avoidTypes: string[];
  description: string;
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUTC - startUTC) / (24 * 60 * 60 * 1000));
}

function getPhaseByDay(dayInCycle: number, avgPeriodLength: number): CyclePhase {
  if (dayInCycle <= avgPeriodLength) {
    return 'menstrual';
  }

  if (dayInCycle <= 13) {
    return 'follicular';
  }

  if (dayInCycle <= 16) {
    return 'ovulation';
  }

  return 'luteal';
}

function getDaysUntilNextPhase(
  phase: CyclePhase,
  dayInCycle: number,
  avgCycleLength: number,
  avgPeriodLength: number,
) {
  const phaseEndDay = {
    menstrual: avgPeriodLength,
    follicular: 13,
    ovulation: 16,
    luteal: avgCycleLength,
  }[phase];

  return Math.max(0, phaseEndDay - dayInCycle + 1);
}

function getPhaseDescription(phase: CyclePhase, dayInCycle: number) {
  const phaseNames: Record<CyclePhase, string> = {
    menstrual: '月经期',
    follicular: '卵泡期',
    ovulation: '排卵期',
    luteal: '黄体期',
  };

  return `${phaseNames[phase]} 第${dayInCycle}天`;
}

function getPhaseDay(phase: CyclePhase, dayInCycle: number, avgPeriodLength: number) {
  if (phase === 'menstrual') return dayInCycle;
  if (phase === 'follicular') return dayInCycle - avgPeriodLength;
  if (phase === 'ovulation') return dayInCycle - 13;
  return dayInCycle - 16;
}

// 根据上次月经开始日期和周期长度，计算当前所处的周期阶段
export function getCurrentCyclePhase(
  lastPeriodStart: string,   // "2026-05-01"
  avgCycleLength: number = 28,    // 默认28
  avgPeriodLength: number = 5,   // 默认5
  today: string = getTodayISO()             // 可选，默认今天
): CycleInfo {
  const cycleLength = Math.max(1, avgCycleLength);
  const periodLength = Math.min(Math.max(1, avgPeriodLength), cycleLength);
  const elapsedDays = getDaysBetween(lastPeriodStart, today);
  const normalizedDayIndex = ((elapsedDays % cycleLength) + cycleLength) % cycleLength;
  const dayInCycle = normalizedDayIndex + 1;
  const phase = getPhaseByDay(dayInCycle, periodLength);

  return {
    phase,
    dayInCycle,
    daysUntilNextPhase: getDaysUntilNextPhase(phase, dayInCycle, cycleLength, periodLength),
    phaseDescription: getPhaseDescription(phase, dayInCycle),
  };
}

export function getCycleContext(settings: UserSettings, today: string = getTodayISO()): CycleContext {
  const cycleLength = Math.max(1, Number(settings.cycleLength) || 28);
  const periodLength = Math.min(Math.max(1, Number(settings.periodLength) || 5), cycleLength);
  const lastPeriodStartDate = settings.lastPeriodStartDate;
  const rawDaysSinceStart = getDaysBetween(lastPeriodStartDate, today);
  const daysSinceStart = Math.max(0, rawDaysSinceStart);
  const normalizedDayIndex = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
  const cycleDay = normalizedDayIndex + 1;
  const currentPhase = getPhaseByDay(cycleDay, periodLength);
  const phaseDay = Math.max(1, getPhaseDay(currentPhase, cycleDay, periodLength));
  const daysToNextPeriod = cycleLength - cycleDay + 1;

  if (process.env.NODE_ENV === 'development') {
    if (rawDaysSinceStart < 0) {
      console.warn('HerFit cycle settings warning: lastPeriodStartDate is in the future, clamped to cycle day 1.');
    }

    console.log('HerFit cycle calculation:', {
      parsedSettings: settings,
      today,
      lastPeriodStartDate,
      calculatedCycleDay: cycleDay,
      calculatedCurrentPhase: currentPhase,
    });
  }

  return {
    currentPhase,
    cycleDay,
    phaseDay,
    daysToNextPeriod,
    cycleLength,
    periodLength,
  };
}

export function getCurrentCyclePhaseFromContext(context: CycleContext): CycleInfo {
  return {
    phase: context.currentPhase,
    dayInCycle: context.cycleDay,
    daysUntilNextPhase: context.daysToNextPeriod,
    phaseDescription: '',
  };
}

export function getCyclePhaseRanges(settings: UserSettings) {
  const start = parseLocalDate(settings.lastPeriodStartDate);
  const cycleLength = Math.max(1, Number(settings.cycleLength) || 28);
  const periodLength = Math.min(Math.max(1, Number(settings.periodLength) || 5), cycleLength);
  const addDays = (days: number) => {
    const date = new Date(start);
    date.setDate(start.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return [
    {
      phase: 'menstrual' as const,
      label: '经期',
      start: addDays(0),
      end: addDays(periodLength - 1),
    },
    {
      phase: 'follicular' as const,
      label: '卵泡期',
      start: addDays(periodLength),
      end: addDays(12),
    },
    {
      phase: 'ovulation' as const,
      label: '排卵期',
      start: addDays(13),
      end: addDays(15),
    },
    {
      phase: 'luteal' as const,
      label: '黄体期',
      start: addDays(16),
      end: addDays(cycleLength - 1),
    },
  ];
}

/* Legacy compatibility helpers use the same calendar-day calculation above. */
export function getCycleContextFromLegacy(settings: UserSettings, today: string = getTodayISO()): CycleContext {
  const info = getCurrentCyclePhase(
    settings.lastPeriodStartDate,
    settings.cycleLength,
    settings.periodLength,
    today,
  );

  return {
    currentPhase: info.phase,
    cycleDay: info.dayInCycle,
    phaseDay: Math.max(1, getPhaseDay(info.phase, info.dayInCycle, settings.periodLength)),
    daysToNextPeriod: Math.max(0, settings.cycleLength - info.dayInCycle + 1),
    cycleLength: settings.cycleLength,
    periodLength: settings.periodLength,
  };
}

// 获取该阶段的训练建议元数据
export function getPhaseTrainingMeta(phase: CyclePhase): PhaseTrainingMeta {
  const meta: Record<CyclePhase, PhaseTrainingMeta> = {
    menstrual: {
      intensityRange: 'low',
      recommendedTypes: ['舒缓瑜伽', '拉伸', '冥想', '轻量散步'],
      avoidTypes: ['高强度间歇', '大重量训练', '倒立类动作', '核心强刺激'],
      description: '经期优先恢复和放松，尤其前3天建议降低训练强度。',
    },
    follicular: {
      intensityRange: 'high',
      recommendedTypes: ['力量训练', '全身燃脂', '技术学习', '渐进挑战'],
      avoidTypes: ['过度疲劳训练'],
      description: '卵泡期通常精力回升，适合安排更有挑战的训练内容。',
    },
    ovulation: {
      intensityRange: 'medium',
      recommendedTypes: ['中等强度力量', '灵活性训练', '稳定性训练'],
      avoidTypes: ['爆发式变向', '关节压力过高的动作'],
      description: '排卵期状态较好，但需要注意关节稳定和动作质量。',
    },
    luteal: {
      intensityRange: 'medium',
      recommendedTypes: ['中低强度力量', '低冲击有氧', '普拉提', '舒缓拉伸'],
      avoidTypes: ['过长时间HIIT', '极限强度挑战'],
      description: '黄体期更适合稳态训练，关注情绪、睡眠和恢复。',
    },
  };

  return meta[phase];
}
