'use client';

import { useEffect, useState } from 'react';
import type { WorkoutLog } from '@/lib/types';

type Feedback = WorkoutLog['feedback'];

const options: Array<{ value: Feedback; label: string }> = [
  { value: 'too_easy', label: '😎 太轻' },
  { value: 'just_right', label: '💪 刚好' },
  { value: 'too_hard', label: '😵 太难' },
  { value: 'skipped', label: '⏭️ 跳过了' },
];

export default function FeedbackModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: Feedback, notes?: string) => void;
}) {
  const [feedback, setFeedback] = useState<Feedback>('just_right');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setNotes('');
      setFeedback('just_right');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const submit = () => {
    onSubmit(feedback, notes.trim() || undefined);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-4">
      <div className="w-full max-w-[430px] rounded-card bg-white p-5 shadow-2xl">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-purple-50 text-3xl">✓</div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">打卡成功</h2>
            <p className="mt-2 text-sm text-gray-500">今天的努力已经记录好了。</p>
            <button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-button bg-herfit-primary font-semibold text-white">
              好的
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">这次训练感觉如何？</h2>
              <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-gray-100 text-gray-500">
                ×
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeedback(option.value)}
                  className={[
                    'min-h-12 rounded-button border px-3 text-sm font-semibold',
                    feedback === option.value ? 'border-herfit-primary bg-purple-50 text-herfit-primaryDark' : 'border-purple-100 text-gray-700',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="备注一下今天的感受（可选）"
              className="mt-4 min-h-24 w-full rounded-button border border-purple-100 p-3 text-sm outline-none focus:border-herfit-primary"
            />
            <button type="button" onClick={submit} className="mt-4 min-h-12 w-full rounded-button bg-herfit-primary font-semibold text-white">
              提交打卡
            </button>
          </>
        )}
      </div>
    </div>
  );
}
