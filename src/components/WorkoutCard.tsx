import type { DailyWorkout } from '@/lib/types';
import ExerciseItem from './ExerciseItem';

export default function WorkoutCard({ workout, isAdjusting }: { workout: DailyWorkout; isAdjusting?: boolean }) {
  const isRest = workout.exercises.length === 0;

  return (
    <section className="rounded-card bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-herfit-primaryDark">今日训练</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">{workout.theme}</h2>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-herfit-accent">{workout.estimatedMinutes}分钟</span>
      </div>

      {isAdjusting ? (
        <div className="mt-4 rounded-button bg-purple-50 p-3 text-sm text-herfit-primaryDark">正在根据今天状态微调计划...</div>
      ) : null}

      <div className="mt-5 space-y-3">
        {isRest ? (
          <div className="rounded-button bg-herfit-warm p-4 text-sm leading-6 text-gray-600">今天适合休息或做舒缓练习。把恢复也算进训练节奏里。</div>
        ) : (
          workout.exercises.map((exercise) => <ExerciseItem key={exercise.id} exercise={exercise} />)
        )}
      </div>

      <a
        href={workout.videoUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex min-h-12 items-center justify-center rounded-button bg-herfit-primary px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(139,92,246,0.2)]"
      >
        搜索跟练视频
      </a>
    </section>
  );
}
