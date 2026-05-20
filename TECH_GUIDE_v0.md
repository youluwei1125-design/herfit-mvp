# HerFit（她练）—— 技术实施指南（修订版）

> 本文档供 AI 编码代理（Codex / Cursor）使用，用于逐步构建 HerFit 产品。
> 请严格按照阶段顺序执行，每个阶段完成后再进入下一个。
> 修订重点：将竞品分析结论落地为产品与技术规则，突出「生理周期 × 当日状态 × 生活场景」三重叠加、外部视频承接、训练前解释层和打卡反馈闭环。

---

## 项目概述

HerFit 是一个面向女性的 AI 训练编排 PWA。产品核心不是自建课程库，而是基于「生理周期 × 当日状态 × 生活场景」三重信息，动态生成适合今天执行的自重训练方案，并通过 B站、小红书、YouTube 等外部平台完成跟练视频承接。

HerFit 的差异化：
1. **周期不是静态标签**，而是训练强度、动作选择、休息安排和解释内容的编排变量。
2. **当日状态会影响今日训练**，包括强度、动作变体、是否休息和训练时长。
3. **场景会影响动作选择**，包括空间需求、噪音、出汗程度、是否适合办公室/酒店/户外执行。
4. **不自建内容库**，而是生成高质量外部视频搜索入口。
5. **每次训练前解释“为什么今天这样练”**，降低用户疑惑和执行阻力。
6. **打卡反馈会反向影响后续计划**，使计划逐步适应用户真实体验。

**技术栈：**
- 框架：Next.js 14+ (App Router)
- 语言：TypeScript
- 样式：Tailwind CSS
- AI：Claude API (claude-sonnet-4-20250514)
- 存储：localStorage
- 部署：Vercel
- PWA：next-pwa

**界面语言：** 纯中文

---

## 项目结构

```text
herfit/
├── public/
│   ├── manifest.json          # PWA 配置
│   ├── icons/                 # App 图标（192x192, 512x512）
│   └── sw.js                  # Service Worker
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 全局布局（含底部导航栏）
│   │   ├── page.tsx           # 今日训练页（首页）
│   │   ├── onboarding/
│   │   │   └── page.tsx       # 新用户引导
│   │   ├── weekly/
│   │   │   └── page.tsx       # 周期视图
│   │   ├── history/
│   │   │   └── page.tsx       # 训练记录
│   │   └── settings/
│   │       └── page.tsx       # 设置页
│   ├── components/
│   │   ├── BottomNav.tsx      # 底部导航栏
│   │   ├── DailyCheckIn.tsx   # 今日状态检查（状态+睡眠+酸痛+症状）
│   │   ├── SceneSelector.tsx  # 场景选择器
│   │   ├── WorkoutCard.tsx    # 训练计划卡片
│   │   ├── ExerciseItem.tsx   # 单个动作展示
│   │   ├── VideoSearchCard.tsx# 外部视频搜索入口
│   │   ├── FeedbackModal.tsx  # 打卡反馈弹窗
│   │   ├── ScienceCard.tsx    # “为什么这样练”解释卡片
│   │   ├── CycleIndicator.tsx # 周期阶段指示器
│   │   ├── MuscleHeatmap.tsx  # 肌群热力图
│   │   └── StreakCounter.tsx  # 连续打卡计数
│   ├── lib/
│   │   ├── claude.ts          # Claude API 调用封装
│   │   ├── prompts.ts         # Prompt 模板
│   │   ├── storage.ts         # localStorage 封装
│   │   ├── cycle.ts           # 生理周期计算
│   │   ├── video.ts           # 外部视频搜索 URL 生成
│   │   ├── types.ts           # TypeScript 类型定义
│   │   └── exercises.ts       # 动作数据库
│   └── app/api/
│       └── chat/
│           └── route.ts       # Claude API 代理路由
├── tailwind.config.ts
├── next.config.js
├── package.json
└── .env.local                 # ANTHROPIC_API_KEY
```

---

## 核心数据类型 (types.ts)

```typescript
// 周期阶段
type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

// 生活场景
type Scene = 'home' | 'office' | 'hotel' | 'outdoor' | 'period_rest';

// 今日状态
type EnergyLevel = 'high' | 'medium' | 'low';

// 今日 readiness 判断
type ReadinessLevel = 'ready' | 'moderate' | 'low';

// 外部视频平台
type VideoPlatform = 'bilibili' | 'xiaohongshu' | 'youtube';

// 用户配置
interface UserProfile {
  id: string;
  name: string;
  goal: 'fat_loss' | 'toning' | 'fitness';           // 减脂 / 塑形 / 体能
  level: 'beginner' | 'intermediate' | 'advanced';   // 入门 / 有基础 / 进阶
  height: number;                                    // cm
  weight: number;                                    // kg
  weeklyDays: number;                                // 每周训练天数 3-6
  sessionMinutes: number;                            // 每次训练时长（分钟）
  preferences: {
    liked: string[];                                 // 喜欢的动作/训练类型
    disliked: string[];                              // 不喜欢的动作/训练类型
    preferredScenes: Scene[];                        // 常用训练场景
    defaultScene: Scene;                             // 默认训练场景
    videoPlatforms: VideoPlatform[];                 // 可接受的视频平台
    allowJumping: boolean;                           // 是否接受跳跃动作
    needQuietWorkout: boolean;                       // 是否需要低噪音训练
  };
  cycle: {
    lastPeriodStart: string;                         // ISO 日期 YYYY-MM-DD
    avgCycleLength: number;                          // 平均周期天数（默认28）
    avgPeriodLength: number;                         // 平均经期天数（默认5）
  };
  status: 'normal' | 'preparing' | 'pregnant' | 'postpartum';
  createdAt: string;
  onboardingCompleted: boolean;
}

// Daily Check-in
interface DailyCheckIn {
  date: string;
  energyLevel: EnergyLevel;
  sleepQuality: 'good' | 'normal' | 'poor';
  sorenessLevel: 'none' | 'mild' | 'obvious';
  symptoms: Array<'cramps' | 'bloating' | 'headache' | 'fatigue' | 'stress' | 'none'>;
  mood: 'good' | 'neutral' | 'low';
  scene: Scene;
}

// 外部视频搜索入口
interface VideoSearch {
  platform: VideoPlatform;
  keywords: string;
  url: string;
  reason: string;
}

// 单个动作
interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];       // 目标肌群
  sets: number;
  reps: string;                 // “12” 或 “30秒”
  tips: string[];               // 动作要点（2-3条）
  contraindications: string[];  // 禁忌/风险标签，例如 menstrual_core_pressure / high_impact / noise_sensitive
}

// 每日训练计划
interface DailyWorkout {
  date: string;                 // ISO 日期
  dayOfWeek: string;            // 周一 / 周二...
  cyclePhase: CyclePhase;
  cycleDay: number;
  scene: Scene;
  energyLevel: EnergyLevel;
  readinessLevel: ReadinessLevel;
  isRestDay: boolean;
  theme: string;                // 如“上肢推”“全身燃脂”“主动恢复”
  exercises: Exercise[];
  warmup: string;
  cooldown: string;
  estimatedMinutes: number;
  videoSearches: VideoSearch[];
  scienceNote: string;          // “为什么今天这样练”的简短说明
  nutritionTip: string;         // 营养/补水小建议
  adjustmentReason?: string;    // Daily Check-in 后的调整原因
}

// 周训练计划
interface WeeklyPlan {
  weekStart: string;
  days: DailyWorkout[];
  generatedAt: string;
}

// 打卡记录
interface WorkoutLog {
  date: string;
  workoutId: string;
  completed: boolean;
  feedback: 'too_easy' | 'just_right' | 'too_hard' | 'skipped';
  notes?: string;
}

// 应用全局状态
interface AppState {
  profile: UserProfile | null;
  currentPlan: WeeklyPlan | null;
  dailyCheckIns: DailyCheckIn[];
  logs: WorkoutLog[];
  streak: number;
}
```

---

## 阶段一：项目初始化

### 任务清单

1. 创建 Next.js 项目：`npx create-next-app@latest herfit --typescript --tailwind --app --src-dir`
2. 安装依赖：`npm install next-pwa @anthropic-ai/sdk`
3. 配置 PWA（manifest.json + next.config.js）
4. 设置全局样式（中文字体优先：`"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`）
5. 创建底部导航栏组件（4个 Tab：今日训练、周期视图、训练记录、设置）
6. 创建基础路由结构
7. 实现 localStorage 封装（storage.ts）

### PWA manifest.json 关键配置

```json
{
  "name": "她练 HerFit",
  "short_name": "她练",
  "description": "女性专属AI训练编排助手",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFF7ED",
  "theme_color": "#8B5CF6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 设计规范

- 主色调：紫色系 (#8B5CF6 主色, #A78BFA 浅紫, #7C3AED 深紫)
- 辅助色：暖橙 (#F97316) 用于强调、打卡
- 背景色：暖白 (#FFF7ED) 或浅灰 (#F9FAFB)
- 圆角：卡片 16px，按钮 12px
- 移动端优先设计，最大宽度 430px 居中

---

## 阶段二：Onboarding 流程

### 任务清单

1. 检测 localStorage 是否有 UserProfile，没有则跳转 Onboarding。
2. 创建分步表单（7步）：
   - Step 1：欢迎页 + 产品介绍，说明 HerFit 基于周期、状态、场景生成训练计划。
   - Step 2：训练目标选择（减脂 / 塑形 / 体能）。
   - Step 3：当前水平（入门 / 有基础 / 进阶）。
   - Step 4：身体数据（身高、体重）。
   - Step 5：训练偏好（每周天数、每次时长、喜欢/讨厌的训练类型）。
   - Step 6：生理周期信息（上次月经开始日期、平均周期天数、平均经期长度）。
   - Step 7：训练场景与视频偏好：
     - 常用训练场景：居家 / 办公室 / 酒店 / 户外
     - 默认训练场景
     - 是否需要低噪音训练
     - 是否接受跳跃动作
     - 偏好视频平台：B站 / 小红书 / YouTube
3. 当前状态（日常健身 / 备孕中 / 孕期 / 产后恢复）可以放在 Step 6 或 Step 7 后。备孕/孕期/产后选择后显示“该功能正在开发中，敬请期待”。
4. 表单完成后保存到 localStorage。
5. 动画过渡效果（slide transition between steps）。

### UI 要求

- 每步一屏，底部有进度条。
- 大按钮，容易点击（最小高度 48px）。
- 选项用卡片式选择，选中状态有明显高亮。
- 日期选择使用原生 `input[type="date"]`。
- 对周期信息和健康状态加免责声明：“本产品仅提供训练建议，不替代专业医疗建议”。

---

## 阶段三：生理周期计算 (cycle.ts)

### 核心函数

```typescript
// 根据上次月经开始日期和周期长度，计算当前所处的周期阶段
function getCurrentCyclePhase(
  lastPeriodStart: string,   // "2026-05-01"
  avgCycleLength: number,    // 默认28
  avgPeriodLength: number,   // 默认5
  today?: string             // 可选，默认今天
): {
  phase: CyclePhase;
  dayInCycle: number;
  daysUntilNextPhase: number;
  phaseDescription: string;
}

// 周期阶段判断逻辑：
// 月经期 (menstrual): day 1 ~ avgPeriodLength
// 卵泡期 (follicular): avgPeriodLength+1 ~ day 13
// 排卵期 (ovulation): day 14 ~ day 16
// 黄体期 (luteal): day 17 ~ avgCycleLength
// 注意：如果超过 avgCycleLength 天，重新从第 1 天算起

function getPhaseTrainingMeta(phase: CyclePhase): {
  intensityRange: 'low' | 'medium' | 'high';
  recommendedTypes: string[];
  avoidTypes: string[];
  description: string;
}

function getPhasesForNext7Days(profile: UserProfile, today?: string): Array<{
  date: string;
  cycleDay: number;
  phase: CyclePhase;
}>;
```

---

## 阶段四：Claude API 集成

### 4.1 API 代理路由 (src/app/api/chat/route.ts)

```typescript
// POST /api/chat
// 作用：前端不直接暴露 API Key，通过 Next.js API Route 代理
// 请求体：{ messages: Message[], systemPrompt: string, type: 'weekly_plan' | 'daily_adjust' | 'science_note' | 'return_greeting' }
// 返回：Claude API 的响应文本

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { messages, systemPrompt } = await req.json();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  return Response.json(response);
}
```

### 4.2 Claude 调用封装 (lib/claude.ts)

```typescript
// 1. 生成周训练计划
async function generateWeeklyPlan(
  profile: UserProfile,
  cycleInfo: ReturnType<typeof getCurrentCyclePhase>,
  phasesThisWeek: Array<{ date: string; cycleDay: number; phase: CyclePhase }>,
  previousLogs: WorkoutLog[]
): Promise<WeeklyPlan>;

// 2. 根据 Daily Check-in 调整每日计划
async function adjustDailyWorkout(
  originalWorkout: DailyWorkout,
  checkIn: DailyCheckIn,
  cyclePhase: CyclePhase,
  cycleDay: number,
  profile: UserProfile
): Promise<DailyWorkout>;

// 3. 生成训练前解释层
async function generateScienceNote(
  todayWorkout: DailyWorkout,
  checkIn: DailyCheckIn,
  profile: UserProfile
): Promise<{
  title: string;
  cycleReason: string;
  stateReason: string;
  sceneReason: string;
  todayAdvice: string;
  nutritionTip: string;
}>;
```

### 4.3 Prompt 模板

详见独立文件：`PROMPTS.md`。

### 4.4 重要：Claude API 返回格式

所有 Prompt 都要求 Claude 返回严格 JSON，便于前端直接解析渲染。在 system prompt 中明确指定：

```text
你必须仅返回有效的 JSON，不要包含任何 Markdown 标记、代码块标记或其他文字。
```

---

## 阶段五：今日训练页（核心页面）

### 页面流程

```text
用户打开首页
  ↓
检查是否有 UserProfile → 无则跳转 Onboarding
  ↓
检查是否有当前周计划 → 无则调用 AI 生成基础周计划
  ↓
显示今日周期阶段 + 今日基础训练卡片
  ↓
显示 Daily Check-in：
  - 今天状态怎么样？（精力充沛 / 一般 / 很累）
  - 睡得怎么样？（好 / 一般 / 差）
  - 有没有酸痛？（无 / 轻微 / 明显）
  - 有没有经期不适或压力？（可多选）
  - 今天在哪练？（居家 / 办公室 / 酒店 / 户外 / 生理期舒缓）
  ↓
根据「周期 × 状态 × 场景」微调今日训练
  ↓
展示最终版今日训练：
  - 训练主题
  - readiness 判断
  - 为什么今天这样练
  - 动作列表
  - 推荐外部视频搜索入口
  - 预估时长
  ↓
底部“完成训练”按钮 → 打卡反馈弹窗 → 写入 logs → 影响后续计划
```

### 组件详细规格

**CycleIndicator.tsx**
- 显示当前周期阶段名称 + 天数。
- 颜色编码：月经期(粉红) / 卵泡期(绿色) / 排卵期(橙色) / 黄体期(蓝色)。
- 点击可展开查看完整周期日历。

**DailyCheckIn.tsx**
- 逐步或卡片式收集今日状态：
  - 😊精力充沛 / 😐一般 / 😴很累
  - 睡眠质量：好 / 一般 / 差
  - 酸痛程度：无 / 轻微 / 明显
  - 今日症状：腹痛 / 腹胀 / 头痛 / 疲劳 / 压力 / 无
- 提交后生成 DailyCheckIn 对象，传给 `adjustDailyWorkout`。

**SceneSelector.tsx**
- 图标卡片：🏠居家 / 🏢办公室 / 🏨酒店 / 🌳户外。
- 如果当前是月经期前3天，额外显示 🧘生理期舒缓。
- 如果用户默认场景已设置，优先高亮默认场景。

**WorkoutCard.tsx**
- 标题：训练主题（如“全身燃脂 HIIT”）。
- readiness 标签：ready / moderate / low。
- 预估时长标签。
- 动作列表（ExerciseItem 组件）。
- 如果 `isRestDay=true`，展示恢复建议，不展示强训练 CTA。

**ExerciseItem.tsx**
- 动作名称 + 组数 × 次数。
- 可折叠的动作要点提示区域。
- 如果 `contraindications` 包含当前风险标签，显示警告图标或替换提示。

**ScienceCard.tsx**
- 标题：“💡 为什么今天这样练？”
- 默认显示摘要，可展开查看：cycleReason / stateReason / sceneReason / todayAdvice。
- 内容必须解释训练安排，而不是泛科普文章。

**VideoSearchCard.tsx**
- 展示 videoSearches 数组。
- 每个平台一个按钮，例如“去 B站搜索”“去小红书搜索”“去 YouTube 搜索”。
- 展示 reason，让用户知道为什么推荐这个搜索方向。
- 使用 `target="_blank"` 打开外部链接。

**FeedbackModal.tsx**
- 4 个选项按钮：😎太轻 / 💪刚好 / 😵太难 / ⏭️跳过了。
- 可选文字备注。
- 提交后显示打卡成功动画 + 连续打卡天数。

### 漏练回归逻辑

```text
如果距离上次打卡 > 1天：
  显示回归欢迎卡片：
    - 鼓励话术（AI 生成或预设模板轮换）
    - “你的计划已经根据今天状态自动调整了”
    - 显示调整后的今日训练
  不显示任何“未完成”标记
  不使用责备、补偿、追赶进度相关话术
```

---

## 阶段六：周期视图页

### 功能

1. 28 天周期日历（当前周期）
   - 每天一个格子，颜色区分周期阶段。
   - 已完成训练的日期显示打卡标记。
   - 今天高亮显示。
2. 本周训练概览（7 天卡片列表）。
3. 肌群覆盖热力图。
   - SVG 人体正面/背面轮廓。
   - 根据本周训练记录，给对应肌群着色（深浅表示训练频次）。
4. 本周编排说明。
   - 解释为什么某几天强度较高、某几天安排恢复。

---

## 阶段七：训练记录页

### 功能

1. 连续打卡天数（大数字展示）。
2. 本月打卡日历（热力图样式）。
3. 动作难度升级轨迹（时间线展示）。
4. 简单统计：本周/本月训练次数、总训练时长。
5. 最近反馈摘要：too_easy / just_right / too_hard / skipped 的比例，用于后续周计划生成。

---

## 阶段八：设置页

### 功能

1. 修改训练目标 / 水平 / 频次。
2. 更新生理周期信息。
3. 修改默认训练场景、视频平台偏好、是否接受跳跃、是否需要低噪音。
4. 导出数据（JSON 下载）。
5. 清除所有数据。
6. 关于 / 免责声明：“本产品提供的训练建议仅供参考，不替代专业医疗建议”。

---

## 阶段九：外部视频搜索服务 (lib/video.ts)

MVP 阶段不爬取视频、不排序视频、不推荐具体视频，只根据 AI 生成的关键词拼接平台搜索 URL。HerFit 只负责生成与训练主题、周期状态和场景匹配的搜索方向，用户自行判断具体视频质量。

```typescript
function buildVideoSearchUrl(input: {
  platform: VideoPlatform;
  keywords: string;
  reason: string;
}): VideoSearch {
  const encodedKeywords = encodeURIComponent(input.keywords);

  const urlMap: Record<VideoPlatform, string> = {
    bilibili: `https://search.bilibili.com/all?keyword=${encodedKeywords}`,
    xiaohongshu: `https://www.xiaohongshu.com/search_result?keyword=${encodedKeywords}`,
    youtube: `https://www.youtube.com/results?search_query=${encodedKeywords}`,
  };

  return {
    platform: input.platform,
    keywords: input.keywords,
    url: urlMap[input.platform],
    reason: input.reason,
  };
}

function buildVideoSearches(inputs: Array<{
  platform: VideoPlatform;
  keywords: string;
  reason: string;
}>): VideoSearch[] {
  return inputs.map(buildVideoSearchUrl);
}
```

### 视频关键词示例

- B站：`居家上肢塑形 无器械 30分钟`
- B站：`经期舒缓瑜伽 15分钟`
- 小红书：`办公室肩颈拉伸 低噪音 10分钟`
- YouTube：`no equipment hotel workout quiet 20 minutes beginner`

### 风险提示

- 不要在 UI 中写“HerFit 精选视频”或“官方推荐视频”。
- 建议写“根据今天训练生成的搜索入口”。
- 外部平台内容质量不可控，设置页和外链区域应保留提示：“外部视频内容由第三方平台提供，请根据自身情况选择”。

---

## localStorage 数据结构

```typescript
const STORAGE_KEYS = {
  PROFILE: 'herfit_profile',              // UserProfile
  CURRENT_PLAN: 'herfit_plan',            // WeeklyPlan
  DAILY_CHECKINS: 'herfit_daily_checkins', // DailyCheckIn[]
  LOGS: 'herfit_logs',                    // WorkoutLog[]
  STREAK: 'herfit_streak',                // number
  LAST_ACTIVE: 'herfit_last_active'       // ISO date string
};
```

---

## 注意事项

1. **移动端优先**：所有页面设计以 375px-430px 宽度为基准，居中显示，最大宽度 430px。
2. **中文字体**：确保中文显示正常，使用系统中文字体栈。
3. **加载状态**：AI 生成计划需要时间，需要有加载动画（skeleton screen 或 spinner）。
4. **错误处理**：Claude API 调用失败时显示友好提示，允许重试，并使用缓存计划降级。
5. **离线体验**：当前计划一旦生成就缓存在本地，即使离线也能查看今日训练。
6. **免责声明**：首次使用、周期信息页、设置页和外部视频区域都要包含“不替代专业医疗建议”的提示。
7. **经期安全**：月经期前3天默认推荐休息 / 瑜伽 / 冥想，不推荐高强度训练。
8. **场景安全**：办公室和酒店场景默认低噪音、小空间、低出汗；户外场景注意不要默认推荐危险环境动作。
9. **外部视频边界**：MVP 只生成搜索入口，不抓取、不下载、不排序、不承诺具体视频质量。
10. **类型一致性**：Prompt 输出 JSON 字段必须与 `types.ts` 保持一致，尤其是 `videoSearches`、`readinessLevel`、`contraindications`、`isRestDay`。
