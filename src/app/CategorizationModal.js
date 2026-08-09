'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#00d4c8', '#22c55e', '#f59e0b', '#a855f7', '#3b82f6', '#ef4444'];

export default function CategorizationModal({ isOpen, onClose, onCreate }) {
  const [courseName, setCourseName] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const creatingRef = useRef(false);

  const submit = async () => {
    if (creatingRef.current || !courseName.trim() || !periodLabel.trim()) return;

    creatingRef.current = true;
    setIsCreating(true);

    try {
      await onCreate?.({
        course_name: courseName.trim(),
        period_label: periodLabel.trim(),
        color,
      });
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
          >
            <div className="mb-4">
              <div className="text-[15px] font-medium text-[var(--fg)]">New category</div>
              <div className="mt-1 text-[12px] text-[var(--fg-3)]">Create a course and period pair.</div>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Course name"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)] outline-none"
              />
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Period, semester, or class"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)] outline-none"
              />
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border ${color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                    aria-label={`Select ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] text-[var(--fg-3)]">Cancel</button>
              <button
                onClick={submit}
                disabled={isCreating || !courseName.trim() || !periodLabel.trim()}
                className="btn-accent min-w-[84px] rounded-lg px-4 py-2 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
