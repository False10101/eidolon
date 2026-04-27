'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// ─── Odometer ──────────────────────────────────────────────────────────────────
const DIGIT_H = 60;

function OdometerDigit({ value }) {
  return (
    <div style={{ height: DIGIT_H, overflow: 'hidden', position: 'relative' }}>
      <motion.div
        animate={{ y: -value * DIGIT_H }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        style={{ willChange: 'transform' }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <div key={n} style={{
            height: DIGIT_H, lineHeight: `${DIGIT_H}px`,
            fontFamily: 'var(--font-geist-mono, monospace)',
            fontSize: 52, fontWeight: 500, color: 'var(--accent)',
            display: 'block', textAlign: 'center',
          }}>
            {n}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function OdometerNumber({ value }) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  const h = Math.floor(v / 100);
  const tens = Math.floor((v % 100) / 10);
  const ones = v % 10;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight: 1 }}>
      {h > 0 && <OdometerDigit value={h} />}
      <OdometerDigit value={tens} />
      <OdometerDigit value={ones} />
      <span style={{
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 28, fontWeight: 500,
        color: 'rgba(0,212,200,0.65)',
        lineHeight: `${DIGIT_H}px`, marginLeft: 3,
      }}>%</span>
    </div>
  );
}

// ─── Audio variant — waveform bars ────────────────────────────────────────────
const BARS = Array.from({ length: 32 }, (_, i) => ({
  height: 18 + Math.sin(i * 0.7) * 14 + Math.sin(i * 1.3) * 7,
  duration: 0.55 + (i % 7) * 0.09,
  delay: (i % 5) * 0.07,
}));

function Waveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 52 }}>
      {BARS.map((bar, i) => (
        <div key={i} style={{
          width: 3, height: bar.height, borderRadius: 99,
          background: `rgba(0,212,200,${0.2 + (i % 5) * 0.1})`,
          animation: `wave-bar ${bar.duration}s ease-in-out ${bar.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

// ─── Document variant — text lines materializing ──────────────────────────────
const DOC_LINES = [
  { w: '88%', delay: 0 },
  { w: '100%', delay: 0.18 },
  { w: '73%', delay: 0.36 },
  { w: '95%', delay: 0.54 },
  { w: '100%', delay: 0.72 },
  { w: '58%', delay: 0.90 },
];

function DocumentLines() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', height: 52, justifyContent: 'center' }}>
      {DOC_LINES.map((line, i) => (
        <div key={i} style={{
          position: 'relative', height: 3, width: line.w,
          borderRadius: 99, background: 'rgba(0,212,200,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, width: '45%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,200,0.55) 50%, transparent 100%)',
            animation: `doc-sweep 2s ease-in-out ${line.delay}s infinite`,
          }} />
        </div>
      ))}
    </div>
  );
}

// ─── Stage pill ────────────────────────────────────────────────────────────────
function StagePill({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      borderRadius: 99, border: '1px solid rgba(255,255,255,0.07)',
      background: 'var(--surface)', padding: '4px 12px',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'var(--accent)',
        animation: 'pulse-dot 1.4s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 11, color: 'var(--fg-2)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── GeneratingOverlay ─────────────────────────────────────────────────────────
// smoothed = true  (default) — asymptotic fake progress, for notes/exam/transcription
// smoothed = false           — real progress direct from backend, for audio only
export default function GeneratingOverlay({
  title, subtitle, targetProgress, onCancel,
  variant = 'audio',
  smoothed = true,
  done = false, doneLabel,
  onView, onViewLabel = 'View result',
  onReset, onResetLabel = 'Start over',
}) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const isDone = done || targetProgress >= 100;
  const targetRef = useRef(targetProgress);

  useEffect(() => {
    targetRef.current = targetProgress;
  }, [targetProgress]);

  useEffect(() => {
    if (isDone) {
      setDisplayProgress(100);
      return;
    }

    if (!smoothed) {
      // Real progress from backend — clamp only, never go backwards
      setDisplayProgress(prev => Math.max(prev, targetProgress ?? 0));
      return;
    }

    // Asymptotic smoothing — for fake/slow progress sources
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const currentTarget = targetRef.current;
        const distance = currentTarget - prev;
        if (distance < 0) return currentTarget;
        if (distance < 0.1) return prev;
        return prev + distance * 0.06;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isDone, smoothed, targetProgress]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDone
            ? 'radial-gradient(ellipse at 50% 45%, rgba(34,197,94,0.05) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 45%, rgba(0,212,200,0.05) 0%, transparent 60%)',
          transition: 'background 0.8s ease',
        }}
      />

      {isDone ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            border: '1px solid rgba(34,197,94,0.25)',
            background: 'rgba(34,197,94,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(34,197,94,0.12), inset 0 1px 0 rgba(34,197,94,0.2)',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, stroke: '#22c55e', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-geist-sans, sans-serif)', fontSize: 22, fontWeight: 400, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
              {title?.replace('…', '') ?? 'Complete'}
            </div>
            {doneLabel && (
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)' }}>{doneLabel}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onView && (
              <button onClick={onView} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--accent)', borderRadius: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 500,
                color: 'var(--on-accent)', border: 'none', cursor: 'pointer',
              }}>
                {onViewLabel}
              </button>
            )}
            {onReset && (
              <button onClick={onReset} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--surface-raised)', borderRadius: 8,
                padding: '10px 16px', fontSize: 13,
                color: 'var(--fg-2)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
              }}>
                {onResetLabel}
              </button>
            )}
          </div>
        </motion.div>

      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: 360, position: 'relative' }}
        >
          {variant === 'audio' ? <Waveform /> : <DocumentLines />}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <OdometerNumber value={displayProgress} />
            <div style={{ fontFamily: 'var(--font-geist-sans, sans-serif)', fontSize: 18, fontWeight: 400, color: 'var(--fg)', letterSpacing: '-0.01em', marginTop: 2 }}>
              {title}
            </div>
            <StagePill label={subtitle} />
          </div>

          <div style={{ width: '100%' }}>
            <div style={{ position: 'relative', height: 2, width: '100%', borderRadius: 99, background: '#1a1a22', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', inset: '0 auto 0 0',
                width: `${displayProgress}%`, borderRadius: 99,
                background: 'linear-gradient(90deg, #007a75, #00d4c8)',
                transition: 'width 0.4s linear',
              }} />
              <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${displayProgress}%`, overflow: 'hidden', borderRadius: 99 }}>
                <div style={{
                  position: 'absolute', inset: '0', width: '55%',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 85%, transparent 100%)',
                  animation: 'bar-sweep 1.8s ease-in-out infinite',
                }} />
              </div>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              style={{ fontSize: 12, color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </motion.div>
      )}

      <style>{`
        @keyframes wave-bar {
          0%   { transform: scaleY(0.3); }
          100% { transform: scaleY(1);   }
        }
        @keyframes doc-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(280%);  }
        }
        @keyframes bar-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(280%);  }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}