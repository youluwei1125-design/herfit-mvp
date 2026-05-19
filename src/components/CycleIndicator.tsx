import type { CycleInfo } from '@/lib/cycle';
import type { CyclePhase } from '@/lib/types';

const phaseMeta: Record<CyclePhase, { label: string; bg: string; text: string; ring: string; description: string }> = {
  menstrual: {
    label: '月经期',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    ring: 'ring-pink-200',
    description: '降低强度，优先恢复和舒缓',
  },
  follicular: {
    label: '卵泡期',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    description: '体能回升，适合力量和挑战',
  },
  ovulation: {
    label: '排卵期',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
    description: '状态较好，注意关节稳定',
  },
  luteal: {
    label: '黄体期',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200',
    description: '保持节奏，关注恢复和睡眠',
  },
};

export default function CycleIndicator({ cycleInfo }: { cycleInfo: CycleInfo }) {
  const meta = phaseMeta[cycleInfo.phase];

  return (
    <section className={`rounded-card ${meta.bg} p-4 ring-1 ${meta.ring}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${meta.text}`}>当前周期</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {meta.label} 第{cycleInfo.dayInCycle}天
          </h2>
          <p className="mt-1 text-sm text-gray-600">{meta.description}</p>
        </div>
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-center text-sm font-bold ${meta.text}`}>
          {cycleInfo.daysUntilNextPhase}
          <br />
          天
        </div>
      </div>
    </section>
  );
}
