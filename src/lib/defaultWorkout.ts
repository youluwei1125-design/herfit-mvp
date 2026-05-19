import type { CycleInfo } from './cycle';
import type { DailyWorkout, WeeklyPlan } from './types';

function generateDefaultVideoUrl(keywords: string) {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(keywords)}`;
}

export function createDefaultDailyWorkout(cycleInfo: CycleInfo, date: string): DailyWorkout {
  if (cycleInfo.phase === 'menstrual' && cycleInfo.dayInCycle <= 3) {
    const videoKeywords = '经期舒缓瑜伽 呼吸放松 20分钟';

    return {
      date,
      cyclePhase: cycleInfo.phase,
      cycleDay: cycleInfo.dayInCycle,
      scene: 'period_rest',
      energyLevel: 'low',
      theme: '生理期舒缓恢复',
      exercises: [
        {
          id: 'default_period_001',
          name: '腹式呼吸',
          muscleGroups: ['呼吸肌', '核心稳定'],
          sets: 3,
          reps: '60秒',
          tips: ['鼻吸口呼，节奏放慢', '让肩颈自然放松', '如果不舒服就缩短时间'],
          contraindications: [],
        },
        {
          id: 'default_period_002',
          name: '猫牛式',
          muscleGroups: ['脊柱', '背部'],
          sets: 2,
          reps: '8次',
          tips: ['动作幅度保持轻柔', '配合呼吸活动脊柱', '避免强行塌腰或拱背'],
          contraindications: [],
        },
      ],
      estimatedMinutes: 20,
      videoKeywords,
      videoUrl: generateDefaultVideoUrl(videoKeywords),
      scienceNote: '经期前几天先恢复，轻柔活动就够了。',
      nutritionTip: '注意补水，选择温热、易消化的食物。',
    };
  }

  const videoKeywords = '居家全身自重训练 20分钟 新手友好';

  return {
    date,
    cyclePhase: cycleInfo.phase,
    cycleDay: cycleInfo.dayInCycle,
    scene: 'home',
    energyLevel: 'medium',
    theme: '全身唤醒自重训练',
    exercises: [
      {
        id: 'default_001',
        name: '徒手深蹲',
        muscleGroups: ['臀腿', '核心'],
        sets: 3,
        reps: '12次',
        tips: ['脚跟踩稳，膝盖朝脚尖方向', '下蹲时保持背部自然挺直', '起身时臀腿发力，不要憋气'],
        contraindications: [],
      },
      {
        id: 'default_002',
        name: '跪姿俯卧撑',
        muscleGroups: ['胸肌', '三头肌', '核心'],
        sets: 3,
        reps: '10次',
        tips: ['双手略宽于肩', '身体从肩到膝保持一条线', '下落慢一点，推起时呼气'],
        contraindications: [],
      },
      {
        id: 'default_003',
        name: '臀桥',
        muscleGroups: ['臀大肌', '腘绳肌'],
        sets: 3,
        reps: '15次',
        tips: ['脚跟靠近臀部', '顶峰收紧臀部1秒', '避免用腰部代偿发力'],
        contraindications: [],
      },
      {
        id: 'default_004',
        name: '平板支撑',
        muscleGroups: ['核心', '肩部稳定'],
        sets: 3,
        reps: '30秒',
        tips: ['手肘在肩膀正下方', '收紧腹部，不塌腰', '保持自然呼吸'],
        contraindications: [],
      },
    ],
    estimatedMinutes: 20,
    videoKeywords,
    videoUrl: generateDefaultVideoUrl(videoKeywords),
    scienceNote: '今天用全身自重动作稳住节奏，强度适中。',
    nutritionTip: '训练后补充蛋白质和碳水，帮助恢复。',
  };
}

export function createDefaultWeeklyPlan(cycleInfo: CycleInfo, date: string): WeeklyPlan {
  return {
    weekStart: date,
    days: [createDefaultDailyWorkout(cycleInfo, date)],
    generatedAt: new Date().toISOString(),
  };
}

export function isDefaultDailyWorkout(workout: DailyWorkout) {
  return workout.exercises.some((exercise) => exercise.id.startsWith('default_'));
}

export function isDefaultWeeklyPlan(plan: WeeklyPlan) {
  return plan.days.some(isDefaultDailyWorkout);
}
