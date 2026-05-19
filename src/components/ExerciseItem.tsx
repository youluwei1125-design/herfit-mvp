'use client';

import { useState } from 'react';
import type { Exercise } from '@/lib/types';

export default function ExerciseItem({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const hasContraindications = exercise.contraindications.length > 0;

  return (
    <div className="rounded-button border border-purple-100 bg-white p-3">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <p className="font-semibold text-gray-900">
            {exercise.name}
            {hasContraindications ? <span className="ml-2 text-herfit-accent">⚠</span> : null}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {exercise.sets}组 × {exercise.reps}
          </p>
        </div>
        <span className="text-sm font-semibold text-herfit-primaryDark">{open ? '收起' : '要点'}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-2 border-t border-purple-50 pt-3 text-sm text-gray-600">
          {exercise.muscleGroups.length > 0 ? <p>目标肌群：{exercise.muscleGroups.join('、')}</p> : null}
          {exercise.tips.map((tip) => (
            <p key={tip}>• {tip}</p>
          ))}
          {hasContraindications ? <p className="text-herfit-accent">经期提示：{exercise.contraindications.join('、')}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
