import type { EnergyLevel } from '@/lib/types';

const options: Array<{ value: EnergyLevel; label: string; description: string }> = [
  { value: 'high', label: '😊 精力充沛', description: '可以接受一点挑战' },
  { value: 'medium', label: '😐 一般', description: '按原计划稳稳完成' },
  { value: 'low', label: '😴 很累', description: '今天需要轻一点' },
];

export default function StatusCheck({
  value,
  onChange,
}: {
  value: EnergyLevel | null;
  onChange: (value: EnergyLevel) => void;
}) {
  return (
    <section className="rounded-card bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">今天状态怎么样？</h2>
      <div className="mt-4 grid gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'min-h-12 rounded-button border p-3 text-left transition',
              value === option.value
                ? 'border-herfit-primary bg-purple-50 text-herfit-primaryDark'
                : 'border-purple-100 bg-white text-gray-700 hover:border-herfit-primaryLight',
            ].join(' ')}
          >
            <span className="block text-base font-semibold">{option.label}</span>
            <span className="mt-1 block text-sm text-gray-500">{option.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
