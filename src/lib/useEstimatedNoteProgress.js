'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_INPUT_TOKENS = 12000;

function getExpectedGenerationMs(inputTokens, style) {
  const tokens = Math.max(0, Number(inputTokens) || DEFAULT_INPUT_TOKENS);

  if (style === 'stripped') return Math.min(60000, 25000 + tokens * 0.45);
  if (style === 'textbook') return Math.min(180000, 70000 + tokens * 1.25);
  return Math.min(110000, 40000 + tokens * 0.75);
}

function getStageProgress(status, elapsedMs, inputTokens, style) {
  switch (status) {
    case 'pending':
      return Math.min(8, (elapsedMs / 4000) * 8);
    case 'reading':
      return 8 + Math.min(7, (elapsedMs / 4000) * 7);
    case 'generating': {
      const expectedMs = getExpectedGenerationMs(inputTokens, style);

      if (elapsedMs <= expectedMs) {
        const ratio = Math.min(1, elapsedMs / expectedMs);
        const eased = 1 - Math.pow(1 - ratio, 1.25);
        return 15 + eased * 77;
      }

      const overtime = elapsedMs - expectedMs;
      return 92 + (1 - Math.exp(-overtime / 60000)) * 4;
    }
    case 'saving':
      return 96 + Math.min(3, (elapsedMs / 3000) * 3);
    case 'completed':
      return 100;
    default:
      return 0;
  }
}

export default function useEstimatedNoteProgress({ active, status, inputTokens, style }) {
  const [progress, setProgress] = useState(0);
  const stageStartedAtRef = useRef(Date.now());
  const previousStatusRef = useRef(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      stageStartedAtRef.current = Date.now();
      previousStatusRef.current = String(status || 'pending').toLowerCase();
      setProgress(0);
    }
    wasActiveRef.current = active;
  }, [active, status]);

  useEffect(() => {
    if (!active) return;

    const normalizedStatus = String(status || 'pending').toLowerCase();
    if (previousStatusRef.current !== normalizedStatus) {
      previousStatusRef.current = normalizedStatus;
      stageStartedAtRef.current = Date.now();
    }

    const update = () => {
      const elapsedMs = Date.now() - stageStartedAtRef.current;
      const next = getStageProgress(normalizedStatus, elapsedMs, inputTokens, style);
      setProgress((current) => normalizedStatus === 'completed'
        ? 100
        : Math.max(current, Math.min(99, next)));
    };

    update();
    const interval = setInterval(update, 400);
    return () => clearInterval(interval);
  }, [active, status, inputTokens, style]);

  return progress;
}
