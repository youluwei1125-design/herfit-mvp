// 用户配置
export interface UserProfile {
  id: string;
  name: string;
  goal: 'fat_loss' | 'toning' | 'fitness';        // 减脂 / 塑形 / 体能
  level: 'beginner' | 'intermediate' | 'advanced';  // 入门 / 有基础 / 进阶
  height: number;           // cm
  weight: number;           // kg
  weeklyDays: number;       // 每周训练天数 3-6
  sessionMinutes: number;   // 每次训练时长（分钟）
  preferences: {
    liked: string[];        // 喜欢的动作类型
    disliked: string[];     // 讨厌的动作类型
  };
  cycle: {
    lastPeriodStart: string;  // ISO 日期 YYYY-MM-DD
    avgCycleLength: number;   // 平均周期天数（默认28）
    avgPeriodLength: number;  // 平均经期天数（默认5）
  };
  status: 'normal' | 'preparing' | 'pregnant' | 'postpartum';
  createdAt: string;
  onboardingCompleted: boolean;
}

// 周期阶段
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

// 生活场景
export type Scene = 'home' | 'office' | 'hotel' | 'outdoor' | 'period_rest';

// 今日状态
export type EnergyLevel = 'high' | 'medium' | 'low';

// 今日 readiness 判断
export type ReadinessLevel = 'ready' | 'moderate' | 'low';

// 外部视频平台
export type VideoPlatform = 'bilibili' | 'xiaohongshu' | 'youtube';

// 默认训练偏好
export type TrainingPreference = 'light' | 'standard' | 'challenge';

export interface UserSettings {
  lastPeriodStart: string;
  avgCycleLength: number;
  avgPeriodLength: number;
  trainingPreference: TrainingPreference;
}

export interface CycleContext {
  currentPhase: CyclePhase;
  cycleDay: number;
  phaseDay: number;
  daysToNextPeriod: number;
}

// 单个动作
export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];      // 目标肌群
  sets: number;
  reps: string;                // "12" 或 "30秒"
  tips: string[];              // 动作要点（2-3条）
  contraindications: string[]; // 经期禁忌标记
}

// 每日训练计划
export interface DailyWorkout {
  date: string;               // ISO 日期
  cyclePhase: CyclePhase;
  cycleDay: number;
  scene: Scene;
  energyLevel: EnergyLevel;
  theme: string;              // 如"上肢推"、"全身燃脂"
  exercises: Exercise[];
  estimatedMinutes: number;
  videoKeywords: string;      // 搜索关键词
  videoUrl: string;           // 拼接好的搜索 URL
  scienceNote: string;        // "为什么"科普内容
  nutritionTip: string;       // 营养小建议
}

export type WorkoutPlan = DailyWorkout;

export interface WorkoutRecord {
  id: string;
  date: string;
  cyclePhase: CyclePhase;
  cycleDay: number;
  workoutName: string;
  duration: number;
  energyLevel: EnergyLevel;
  feedback: WorkoutLog['feedback'];
  notes?: string;
  completedAt: string;
}

// 周训练计划
export interface WeeklyPlan {
  weekStart: string;
  days: DailyWorkout[];
  generatedAt: string;
}

// 打卡记录
export interface WorkoutLog {
  date: string;
  workoutId: string;
  completed: boolean;
  feedback: 'too_easy' | 'just_right' | 'too_hard' | 'skipped';
  notes?: string;
}

// 应用全局状态
export interface AppState {
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  settings: UserSettings | null;
  records: WorkoutRecord[];
  logs: WorkoutLog[];
  streak: number;
}
