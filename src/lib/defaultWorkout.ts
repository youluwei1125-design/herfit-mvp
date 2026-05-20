import type { CycleInfo } from './cycle';
import type { CyclePhase, DailyWorkout, EnergyLevel, Exercise, TrainingPreference, WeeklyPlan } from './types';

function generateDefaultVideoUrl(keywords: string) {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(keywords)}`;
}

function exercise(id: string, name: string, muscleGroups: string[], sets: number, reps: string, tips: string[]): Exercise {
  return {
    id,
    name,
    muscleGroups,
    sets,
    reps,
    tips,
    contraindications: [],
  };
}

const workoutTemplates: Record<
  CyclePhase,
  Record<
    EnergyLevel,
    {
      theme: string;
      minutes: [number, number, number];
      keywords: string;
      exercises: Exercise[];
      scienceNote: string;
      nutritionTip: string;
    }
  >
> = {
  menstrual: {
    low: {
      theme: '经期舒缓恢复',
      minutes: [8, 12, 15],
      keywords: '经期舒缓恢复 瑜伽 拉伸 呼吸',
      exercises: [
        exercise('default_menstrual_low_1', '猫牛式', ['脊柱', '背部'], 2, '8次', ['动作保持轻柔', '配合呼吸活动脊柱', '不追求幅度']),
        exercise('default_menstrual_low_2', '婴儿式呼吸', ['背部', '呼吸'], 3, '45秒', ['肩颈放松', '慢慢呼气', '腹部不适就缩短时间']),
        exercise('default_menstrual_low_3', '仰卧抱膝', ['下背部', '髋部'], 2, '30秒', ['双膝轻轻靠近胸口', '不要挤压腹部', '呼吸放慢']),
        exercise('default_menstrual_low_4', '骨盆前后倾', ['骨盆', '核心稳定'], 2, '10次', ['幅度小一点', '腰背贴近地面', '避免憋气']),
      ],
      scienceNote: '经期先降低刺激，用轻柔活动缓解紧绷。',
      nutritionTip: '补水，选择温热易消化食物。',
    },
    medium: {
      theme: '低强度唤醒训练',
      minutes: [12, 15, 18],
      keywords: '经期低强度训练 臀桥 鸟狗 拉伸',
      exercises: [
        exercise('default_menstrual_medium_1', '站姿肩颈放松', ['肩颈'], 2, '45秒', ['肩膀下沉', '动作慢', '不要耸肩']),
        exercise('default_menstrual_medium_2', '臀桥', ['臀部', '后侧链'], 2, '12次', ['脚跟踩稳', '臀部发力', '腰部不过度顶起']),
        exercise('default_menstrual_medium_3', '鸟狗', ['核心稳定', '背部'], 2, '8次/侧', ['骨盆保持稳定', '伸展慢一点', '不要塌腰']),
        exercise('default_menstrual_medium_4', '死虫式', ['核心稳定'], 2, '8次/侧', ['腰背贴地', '动作可缩小', '保持呼吸']),
      ],
      scienceNote: '低强度激活能维持节奏，也避免给腹部太多压力。',
      nutritionTip: '可补充含铁食物。',
    },
    high: {
      theme: '经期轻量活动',
      minutes: [15, 18, 20],
      keywords: '经期轻量低冲击训练 无跳跃',
      exercises: [
        exercise('default_menstrual_high_1', '原地踏步', ['心肺', '下肢'], 3, '45秒', ['低冲击不跳跃', '膝盖自然抬起', '保持轻松呼吸']),
        exercise('default_menstrual_high_2', '靠墙俯卧撑', ['胸肩', '手臂'], 2, '12次', ['身体成直线', '手腕放松', '推起时呼气']),
        exercise('default_menstrual_high_3', '站姿髋外展', ['臀中肌'], 2, '12次/侧', ['脚尖朝前', '骨盆不歪', '小幅度控制']),
        exercise('default_menstrual_high_4', '坐姿前屈放松', ['后侧链'], 2, '40秒', ['膝盖可微屈', '背部放松', '不强拉']),
      ],
      scienceNote: '今天适合轻量活动，保持循环，不做跳跃和高强度核心。',
      nutritionTip: '训练后注意保暖和补水。',
    },
  },
  follicular: {
    low: {
      theme: '轻量全身激活',
      minutes: [12, 15, 18],
      keywords: '轻量全身激活 自重训练 新手',
      exercises: [
        exercise('default_follicular_low_1', '徒手早安式', ['臀腿', '后侧链'], 2, '12次', ['髋部向后推', '背部保持自然', '膝盖微屈']),
        exercise('default_follicular_low_2', '跪姿俯卧撑', ['胸肩', '手臂'], 2, '8次', ['身体成直线', '下落慢', '不要塌腰']),
        exercise('default_follicular_low_3', '臀桥', ['臀部'], 2, '14次', ['脚跟发力', '顶峰停1秒', '不要用腰顶']),
        exercise('default_follicular_low_4', '鸟狗', ['核心稳定'], 2, '8次/侧', ['骨盆稳定', '慢伸慢收', '保持呼吸']),
      ],
      scienceNote: '卵泡期体能回升，轻量激活能帮你进入训练节奏。',
      nutritionTip: '补足蛋白质帮助恢复。',
    },
    medium: {
      theme: '全身基础力量',
      minutes: [20, 25, 30],
      keywords: '全身基础力量 自重训练 25分钟',
      exercises: [
        exercise('default_follicular_medium_1', '徒手深蹲', ['臀腿', '核心'], 3, '12次', ['膝盖朝脚尖', '脚跟踩稳', '起身时臀腿发力']),
        exercise('default_follicular_medium_2', '跪姿俯卧撑', ['胸肩', '手臂'], 3, '10次', ['双手略宽于肩', '核心收紧', '推起时呼气']),
        exercise('default_follicular_medium_3', '反向弓步', ['臀腿'], 3, '10次/侧', ['步幅适中', '前脚踩稳', '躯干直立']),
        exercise('default_follicular_medium_4', '平板支撑', ['核心'], 3, '30秒', ['肘在肩下', '不塌腰', '自然呼吸']),
      ],
      scienceNote: '卵泡期适合做基础力量，动作质量优先。',
      nutritionTip: '训练前后都要补水。',
    },
    high: {
      theme: '力量进阶训练',
      minutes: [25, 30, 35],
      keywords: '力量进阶 自重训练 30分钟',
      exercises: [
        exercise('default_follicular_high_1', '深蹲脉冲', ['臀腿'], 3, '12次', ['保持控制', '膝盖稳定', '不要弹震']),
        exercise('default_follicular_high_2', '标准俯卧撑', ['胸肩', '手臂'], 3, '8次', ['身体成直线', '下落慢', '推起有力']),
        exercise('default_follicular_high_3', '行走弓步', ['臀腿', '平衡'], 3, '10次/侧', ['步伐稳定', '膝盖对齐', '核心收紧']),
        exercise('default_follicular_high_4', '侧平板支撑', ['侧腹', '肩部稳定'], 3, '25秒/侧', ['肩膀远离耳朵', '髋部抬起', '保持呼吸']),
      ],
      scienceNote: '今天能量较好，可以提高力量刺激，但仍保持动作控制。',
      nutritionTip: '补充碳水支持训练。',
    },
  },
  ovulation: {
    low: {
      theme: '稳定性恢复训练',
      minutes: [15, 18, 20],
      keywords: '排卵期 稳定性 恢复训练',
      exercises: [
        exercise('default_ovulation_low_1', '站姿髋环绕', ['髋部'], 2, '8次/侧', ['幅度适中', '动作慢', '骨盆稳定']),
        exercise('default_ovulation_low_2', '鸟狗停顿', ['核心稳定', '背部'], 2, '8次/侧', ['伸展后停2秒', '不要晃动', '自然呼吸']),
        exercise('default_ovulation_low_3', '单腿臀桥', ['臀部', '稳定'], 2, '8次/侧', ['髋部保持水平', '脚跟发力', '不要用腰顶']),
        exercise('default_ovulation_low_4', '侧卧蚌式', ['臀中肌'], 2, '12次/侧', ['骨盆不后仰', '脚跟并拢', '小幅度控制']),
      ],
      scienceNote: '排卵期注意关节稳定，恢复训练更适合疲劳状态。',
      nutritionTip: '注意睡眠和补水。',
    },
    medium: {
      theme: '核心稳定 + 下肢控制',
      minutes: [25, 28, 30],
      keywords: '核心稳定 下肢控制 低冲击训练',
      exercises: [
        exercise('default_ovulation_medium_1', '慢速深蹲', ['臀腿'], 3, '10次', ['下落3秒', '膝盖稳定', '脚跟踩稳']),
        exercise('default_ovulation_medium_2', '后撤弓步', ['臀腿', '平衡'], 3, '10次/侧', ['落地轻', '核心收紧', '避免膝盖内扣']),
        exercise('default_ovulation_medium_3', '死虫式', ['核心稳定'], 3, '10次/侧', ['腰背贴地', '动作慢', '不憋气']),
        exercise('default_ovulation_medium_4', '侧平板抬髋', ['侧腹', '肩部稳定'], 2, '8次/侧', ['肩膀稳定', '髋部控制', '不追求速度']),
      ],
      scienceNote: '排卵期适合中等强度，重点放在稳定和控制。',
      nutritionTip: '训练后补充蛋白质。',
    },
    high: {
      theme: '中等强度力量 + 稳定',
      minutes: [30, 32, 35],
      keywords: '中等强度力量 稳定训练 无跳跃',
      exercises: [
        exercise('default_ovulation_high_1', '保加利亚分腿蹲', ['臀腿', '平衡'], 3, '8次/侧', ['动作可扶墙', '膝盖对齐', '慢速控制']),
        exercise('default_ovulation_high_2', '俯卧撑肩触', ['胸肩', '核心稳定'], 3, '8次/侧', ['骨盆少晃', '手掌稳', '不塌腰']),
        exercise('default_ovulation_high_3', '单腿罗马尼亚硬拉', ['后侧链', '平衡'], 3, '8次/侧', ['髋部折叠', '背部自然', '先慢后稳']),
        exercise('default_ovulation_high_4', '低冲击登山步', ['核心', '心肺'], 3, '35秒', ['交替迈步', '不做跳跃', '肩膀稳定']),
      ],
      scienceNote: '能量好也优先低冲击力量，减少关节压力。',
      nutritionTip: '避免空腹硬撑训练。',
    },
  },
  luteal: {
    low: {
      theme: '低冲击舒缓训练',
      minutes: [10, 12, 15],
      keywords: '黄体期 低冲击 舒缓训练',
      exercises: [
        exercise('default_luteal_low_1', '原地踏步', ['心肺'], 2, '45秒', ['保持低冲击', '手臂自然摆动', '能说话的强度']),
        exercise('default_luteal_low_2', '靠墙天使', ['肩背'], 2, '10次', ['背部贴墙', '动作慢', '不要耸肩']),
        exercise('default_luteal_low_3', '臀桥', ['臀部'], 2, '12次', ['脚跟发力', '顶峰收紧', '腰部放松']),
        exercise('default_luteal_low_4', '坐姿拉伸', ['背部', '腿后侧'], 2, '40秒', ['不要强拉', '呼吸放慢', '肩颈放松']),
      ],
      scienceNote: '黄体期疲劳时适合低冲击，先照顾恢复。',
      nutritionTip: '留意饥饿感，规律进食。',
    },
    medium: {
      theme: '低冲击力量训练',
      minutes: [20, 22, 25],
      keywords: '黄体期 低冲击力量 20分钟',
      exercises: [
        exercise('default_luteal_medium_1', '箱式深蹲', ['臀腿'], 3, '10次', ['臀部向后坐', '脚跟踩稳', '不要追求速度']),
        exercise('default_luteal_medium_2', '跪姿俯卧撑', ['胸肩'], 3, '8次', ['核心收紧', '下落控制', '推起呼气']),
        exercise('default_luteal_medium_3', '侧卧抬腿', ['臀中肌'], 3, '12次/侧', ['脚尖略向前', '骨盆稳定', '小幅度控制']),
        exercise('default_luteal_medium_4', '平板支撑', ['核心'], 2, '25秒', ['不塌腰', '自然呼吸', '疲劳就降低时间']),
      ],
      scienceNote: '黄体期用低冲击力量维持训练，不做过多爆发。',
      nutritionTip: '补充镁和优质碳水。',
    },
    high: {
      theme: '稳态力量 + 核心控制',
      minutes: [25, 28, 30],
      keywords: '稳态力量 核心控制 低冲击',
      exercises: [
        exercise('default_luteal_high_1', '慢速深蹲', ['臀腿'], 3, '12次', ['节奏稳定', '膝盖对齐', '脚跟踩稳']),
        exercise('default_luteal_high_2', '反向弓步', ['臀腿'], 3, '10次/侧', ['落地轻', '躯干直立', '核心收紧']),
        exercise('default_luteal_high_3', '俯卧撑支撑肩触', ['核心', '肩部稳定'], 3, '10次/侧', ['骨盆少晃', '手掌撑稳', '不追求快']),
        exercise('default_luteal_high_4', '死虫式', ['核心稳定'], 3, '10次/侧', ['腰背贴地', '慢速控制', '配合呼吸']),
      ],
      scienceNote: '今天适合稳态力量，避免高强度间歇带来额外压力。',
      nutritionTip: '训练后认真补水。',
    },
  },
};

function preferenceIndex(trainingPreference: TrainingPreference) {
  if (trainingPreference === 'light') return 0;
  if (trainingPreference === 'challenge') return 2;
  return 1;
}

export function createDefaultDailyWorkout(
  cycleInfo: CycleInfo,
  date: string,
  energyLevel: EnergyLevel = 'medium',
  trainingPreference: TrainingPreference = 'standard',
): DailyWorkout {
  const template = workoutTemplates[cycleInfo.phase][energyLevel];
  const estimatedMinutes = template.minutes[preferenceIndex(trainingPreference)];

  return {
    date,
    cyclePhase: cycleInfo.phase,
    cycleDay: cycleInfo.dayInCycle,
    scene: cycleInfo.phase === 'menstrual' && cycleInfo.dayInCycle <= 3 ? 'period_rest' : 'home',
    energyLevel,
    theme: template.theme,
    exercises: template.exercises,
    estimatedMinutes,
    videoKeywords: template.keywords,
    videoUrl: generateDefaultVideoUrl(template.keywords),
    scienceNote: template.scienceNote,
    nutritionTip: template.nutritionTip,
  };
}

export function createDefaultWeeklyPlan(
  cycleInfo: CycleInfo,
  date: string,
  energyLevel: EnergyLevel = 'medium',
  trainingPreference: TrainingPreference = 'standard',
): WeeklyPlan {
  return {
    weekStart: date,
    days: [createDefaultDailyWorkout(cycleInfo, date, energyLevel, trainingPreference)],
    generatedAt: new Date().toISOString(),
  };
}

export function isDefaultDailyWorkout(workout: DailyWorkout) {
  return workout.exercises.some((exercise) => exercise.id.startsWith('default_'));
}

export function isDefaultWeeklyPlan(plan: WeeklyPlan) {
  return plan.days.some(isDefaultDailyWorkout);
}
