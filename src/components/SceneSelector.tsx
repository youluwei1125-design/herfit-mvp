import type { Scene } from '@/lib/types';

const baseScenes: Array<{ value: Scene; label: string }> = [
  { value: 'home', label: '🏠 居家' },
  { value: 'office', label: '🏢 办公室' },
  { value: 'hotel', label: '🏨 酒店' },
  { value: 'outdoor', label: '🌳 户外' },
];

export default function SceneSelector({
  value,
  showPeriodRest,
  onChange,
}: {
  value: Scene | null;
  showPeriodRest: boolean;
  onChange: (value: Scene) => void;
}) {
  const scenes = showPeriodRest ? [...baseScenes, { value: 'period_rest' as const, label: '🧘 生理期舒缓' }] : baseScenes;

  return (
    <section className="rounded-card bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">今天在哪练？</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {scenes.map((scene) => (
          <button
            key={scene.value}
            type="button"
            onClick={() => onChange(scene.value)}
            className={[
              'min-h-12 rounded-button border px-3 py-4 text-sm font-semibold transition',
              value === scene.value
                ? 'border-herfit-primary bg-purple-50 text-herfit-primaryDark'
                : 'border-purple-100 bg-white text-gray-700 hover:border-herfit-primaryLight',
            ].join(' ')}
          >
            {scene.label}
          </button>
        ))}
      </div>
    </section>
  );
}
