import type { CycleInfo } from './cycle';
import type { CyclePhase, DailyWorkout, EnergyLevel, Scene, UserProfile, WorkoutLog } from './types';

const JSON_ONLY_INSTRUCTION = [
  '你必须仅返回有效的 JSON。',
  '不要使用 Markdown。',
  '不要使用 ```json 代码块。',
  '不要添加解释文字。',
  '不要添加注释。',
  '不要返回多余字段。',
  '返回内容必须严格符合 HerFit 前端 DailyWorkout 数据结构。',
].join('\n');

export const WEEKLY_PLAN_SYSTEM_PROMPT = `
你是 HerFit 的 AI 训练编排引擎，专为女性用户设计个性化的自重训练计划。

你的核心职责：
1. 根据用户今天的生理周期阶段、训练目标、水平和可用时间，编排科学合理的今日训练计划
2. 严格遵循运动科学原则：肌群轮换、渐进超负荷、充分休息
3. 特别注意女性生理周期对训练的影响

生理周期训练原则（必须严格遵守）：
- 月经期（第1-5天）：前3天只推荐休息/轻柔瑜伽/冥想/呼吸练习。第4天起可恢复低强度训练。绝对禁止：仰卧起坐、倒立、深度扭转、高冲击跳跃
- 卵泡期（第6-13天）：雌激素上升期，体能较好。适合力量训练、低冲击HIIT
- 排卵期（第14-16天）：体能较好但韧带松弛。默认使用中等强度、低冲击训练，避免过度拉伸和高冲击跳跃
- 黄体期（第17-28天）：体温升高，脂肪供能增加。前半段可中等强度，后半段降至中低强度。适合中低强度有氧、瑜伽、普拉提

动作选择原则：
- 只推荐自重/无器械动作（深蹲、俯卧撑、平板支撑、弓步、臀桥等）
- 排卵期默认不要推荐波比跳、深蹲跳、开合跳、跳跃弓步等高冲击动作
- 每次训练包含：热身（5分钟）→ 主训练 → 拉伸放松（5分钟）
- 注意上下肢均衡、推拉均衡
- 根据用户水平调整动作难度变体（如：标准俯卧撑 vs 跪姿俯卧撑）

你必须仅返回有效的 JSON，不包含任何 Markdown 标记、代码块标记或任何其他非 JSON 文字。
${JSON_ONLY_INSTRUCTION}
`.trim();

export const DAILY_ADJUST_SYSTEM_PROMPT = `
你是 HerFit 的实时训练调整引擎。用户今天的状态或场景与原计划不同，你需要对今天的训练计划进行微调。

微调原则：
1. 保持训练主题不变（除非状态为"很累"需要大幅调整）
2. 状态调整：
   - "精力充沛"：可以在原计划基础上适当加组或升级动作变体
   - "一般"：保持原计划不变
   - "很累"：降低组数、减少动作数量、用简单变体替换高难动作
3. 场景调整：
   - "办公室"：替换为5-10分钟的久坐拉伸、肩颈放松、站立有氧
   - "酒店"：替换为小空间无器械训练（跳跃类注意噪音）
   - "户外"：可加入快走/慢跑元素
   - "生理期舒缓"：替换为轻柔瑜伽/冥想/呼吸练习，时长15-20分钟
4. 如果当前周期阶段是 ovulation，默认不要加入波比跳、深蹲跳、开合跳、跳跃弓步等高冲击动作
5. estimatedMinutes 必须控制在20到35之间

你必须仅返回有效的 JSON，不包含任何 Markdown 标记、代码块标记或任何其他非 JSON 文字。
${JSON_ONLY_INSTRUCTION}
`.trim();

export const SCIENCE_NOTE_SYSTEM_PROMPT = `
你是 HerFit 的健康科普撰写引擎。你需要用通俗易懂的中文，向普通女性用户解释今天训练安排背后的运动科学和生理知识。

写作原则：
1. 简短：30-60字为宜，最多不超过80字
2. 通俗：避免专业术语，如需使用则附带解释
3. 有用：不只是知识，要和今天的训练直接挂钩，让用户知道"所以我应该..."
4. 温暖：语气友善鼓励，像一个懂你的朋友在分享知识
5. 科学：基于运动科学和女性生理学的真实知识，不编造

内容可以覆盖：
- 当前周期阶段的激素变化及其对运动表现的影响
- 为什么今天推荐这个训练强度/类型
- 与当天训练相关的营养建议
- 常见的健身误区纠正（如"局部减脂是伪科学"）
- 动作背后的肌肉运动学知识

你必须仅返回有效的 JSON，不包含任何 Markdown 标记、代码块标记或任何其他非 JSON 文字。
${JSON_ONLY_INSTRUCTION}
`.trim();

export const MISSED_WORKOUT_SYSTEM_PROMPT = `
你是 HerFit 的用户关怀引擎。用户有几天没有训练了，现在回来了。你需要生成一段温暖的鼓励话术，让她感受到被欢迎而不是被评判。

写作原则：
1. 绝对不要有任何责备、遗憾或"你已经X天没练了"的表述
2. 强调"回来就好"、"今天是新的开始"
3. 简短温暖，2-3句话
4. 可以适当幽默
5. 提到计划已自动调整，随时可以开始

你必须仅返回有效的 JSON，不包含任何 Markdown 标记、代码块标记或任何其他非 JSON 文字。
${JSON_ONLY_INSTRUCTION}
`.trim();

export const PROMPTS = {
  weeklyPlan: WEEKLY_PLAN_SYSTEM_PROMPT,
  dailyAdjust: DAILY_ADJUST_SYSTEM_PROMPT,
  scienceNote: SCIENCE_NOTE_SYSTEM_PROMPT,
  missedWorkout: MISSED_WORKOUT_SYSTEM_PROMPT,
} as const;

const dayOfWeekLabels = ['日', '一', '二', '三', '四', '五', '六'];

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getDayOfWeek(date: string) {
  return `周${dayOfWeekLabels[new Date(`${date}T00:00:00`).getDay()]}`;
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join('、') : '无特别偏好';
}

function formatRecentLogs(logs: WorkoutLog[]) {
  if (logs.length === 0) {
    return '暂无历史反馈';
  }

  return logs
    .slice(-7)
    .map((log) => `- ${log.date}：${log.feedback}${log.notes ? `，备注：${log.notes}` : ''}`)
    .join('\n');
}

export function buildWeeklyPlanUserPrompt(profile: UserProfile, cycleInfo: CycleInfo, previousLogs: WorkoutLog[]) {
  const today = getTodayISO();

  return `
请只为我生成今天 1 天的训练计划，不要生成周计划，不要生成 7 天计划。

我的信息：
- 训练目标：${profile.goal}（fat_loss=减脂 / toning=塑形 / fitness=体能提升）
- 当前水平：${profile.level}（beginner=入门 / intermediate=有基础 / advanced=进阶）
- 身高体重：${profile.height}cm / ${profile.weight}kg
- 每周训练天数：${profile.weeklyDays}天
- 每次训练时长：${profile.sessionMinutes}分钟
- 喜欢的训练类型：${formatList(profile.preferences.liked)}
- 不喜欢的训练类型：${formatList(profile.preferences.disliked)}

生理周期信息：
- 今天是周期第${cycleInfo.dayInCycle}天
- 当前阶段：${cycleInfo.phase}（menstrual/follicular/ovulation/luteal）

历史反馈（最近7次训练）：
${formatRecentLogs(previousLogs)}
（如果多次反馈"too_easy"，请适当提升难度；如果多次"too_hard"，请降低难度）

今天是${today}（${getDayOfWeek(today)}），请只生成今天的 DailyWorkout。

返回以下 JSON 格式：
{
  "date": "${today}",
  "cyclePhase": "${cycleInfo.phase}",
  "cycleDay": ${cycleInfo.dayInCycle},
  "scene": "home",
  "energyLevel": "medium",
  "theme": "上肢推+核心",
  "exercises": [
    {
      "id": "exercise_001",
      "name": "跪姿俯卧撑",
      "muscleGroups": ["胸肌", "三头肌"],
      "sets": 3,
      "reps": "12",
      "tips": ["双手与肩同宽", "下落时吸气，推起时呼气", "保持核心收紧，不要塌腰"],
      "contraindications": []
    }
  ],
  "warmup": "5分钟原地慢跑+关节活动",
  "cooldown": "5分钟全身拉伸",
  "estimatedMinutes": 25,
  "videoKeywords": "居家上肢训练 无器械 30分钟",
  "videoUrl": "",
  "scienceNote": "今天用中等强度覆盖全身，稳一点更容易坚持。",
  "nutritionTip": "训练后补充水和蛋白质。"
}

注意：
1. 返回对象必须包含且只包含这些顶层字段：date、cyclePhase、cycleDay、scene、energyLevel、theme、exercises、estimatedMinutes、videoKeywords、videoUrl、scienceNote、nutritionTip
2. 休息日 exercises 为空数组，theme 写成"休息恢复"或"生理期舒缓"
3. 月经期前3天必须设为休息日或仅安排瑜伽/冥想
4. videoKeywords 要具体、适合在B站搜索
5. estimatedMinutes 必须在20到35之间
6. scienceNote 控制在30-60字，短一点，直接说明为什么这样练
7. nutritionTip 控制在30字以内
8. 如果当前阶段是 ovulation，默认不要出现波比跳、深蹲跳、开合跳、跳跃弓步等高冲击动作
9. 每个 exercise 必须包含 id、name、muscleGroups、sets、reps、tips、contraindications
10. tips 每个动作给2-3条，包含常见错误提醒和正确发力要点
11. videoUrl 可以留空，由前端补齐
12. 只返回一个 JSON 对象，不要返回 days 数组，不要返回 weekStart
`.trim();
}

export function buildDailyAdjustUserPrompt(
  originalWorkout: DailyWorkout,
  energyLevel: EnergyLevel,
  scene: Scene,
  cyclePhase: CyclePhase,
) {
  return `
请微调今天的训练计划。

原计划：
${JSON.stringify(originalWorkout, null, 2)}

用户今天的状态：${energyLevel}（high=精力充沛 / medium=一般 / low=很累）
用户今天的场景：${scene}（home=居家 / office=办公室 / hotel=酒店 / outdoor=户外 / period_rest=生理期舒缓）
当前周期阶段：${cyclePhase}，周期第${originalWorkout.cycleDay}天

请返回调整后的完整 DailyWorkout JSON（格式与原计划相同）。
如果状态为"一般"且场景为"居家"，可以直接返回原计划不做修改。
`.trim();
}

export function buildScienceNoteUserPrompt(cyclePhase: CyclePhase, todayWorkout: DailyWorkout, level?: UserProfile['level']) {
  return `
请生成今天的科普卡片内容。

今天的训练主题：${todayWorkout.theme}
周期阶段：${cyclePhase}，第${todayWorkout.cycleDay}天
训练动作包含：${todayWorkout.exercises.map((exercise) => exercise.name).join('、') || '休息/舒缓练习'}
用户水平：${level ?? 'beginner'}

请返回：
{
  "title": "💡 标题（10字以内）",
  "content": "科普正文（30-60字）",
  "nutritionTip": "🥗 营养小建议（30字以内）"
}
`.trim();
}

export function buildMissedWorkoutUserPrompt(input: {
  lastActiveDate: string;
  today: string;
  daysSinceLastActive: number;
  name: string;
  cyclePhase: CyclePhase;
}) {
  return `
用户上次训练日期：${input.lastActiveDate}
今天日期：${input.today}
间隔天数：${input.daysSinceLastActive}
用户名：${input.name}
当前周期阶段：${input.cyclePhase}

请返回：
{
  "greeting": "欢迎回来的一句话",
  "message": "鼓励正文（2-3句）",
  "callToAction": "引导开始训练的一句话"
}
`.trim();
}
