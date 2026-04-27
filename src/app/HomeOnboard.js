'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── HomeOnboard ───────────────────────────────────────────────────────────────
// Tooltip-based walkthrough for the home page.
// Highlights 4 elements via a spotlight + floating tooltip.
// Uses data-onboard="step-X" attributes on target elements.
// ──────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    target: 'pipeline',
    title: 'This is how Eidolon works',
    desc: 'Four tools, one pipeline. Start with an audio file at Step 01 and follow through to exam prep at Step 04 — or jump in at any step if you already have a transcript or note.',
    placement: 'bottom',
  },
  {
    target: 'balance',
    title: 'Your credit balance',
    desc: 'Eidolon runs on credits. Top up here — most notes cost ฿9–17. Credits never expire, so load up once and spend at your pace.',
    placement: 'bottom',
  },
  {
    target: 'step-01',
    title: 'Start here — it\'s free',
    desc: 'Audio Converter is completely free. Drop any audio or video file and convert it to MP3, WAV, or M4A. You can also chain it directly into transcription from the same screen.',
    placement: 'top',
  },
  {
    target: 'step-03',
    title: 'This is the core — Inclass Notes',
    desc: 'Upload your transcript or recording, pick a note style (Exam, Standard, or Textbook), and get structured notes in under a minute. This is what you\'re paying for.',
    placement: 'top',
  },
];

function getRect(target) {
  const el = document.querySelector(`[data-onboard="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export default function HomeOnboard() {
  const [visible, setVisible] = useState(false);
  const [cur, setCur] = useState(0);
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('onboarded_home')) {
      // slight delay so DOM is fully painted
      setTimeout(() => setVisible(true), 400);
    }
  }, []);

  // Track rect of target element
  useEffect(() => {
    if (!visible) return;
    const update = () => {
      setRect(getRect(STEPS[cur].target));
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [visible, cur]);

  const dismiss = () => {
    localStorage.setItem('onboarded_home', '1');
    setVisible(false);
  };

  const next = () => {
    if (cur < STEPS.length - 1) setCur(c => c + 1);
    else dismiss();
  };

  if (!visible || !rect) return null;

  const step = STEPS[cur];
  const isLast = cur === STEPS.length - 1;
  const PAD = 8;

  // Tooltip positioning
  const tooltipW = 320;
  const tooltipH = 160; // approx
  let tooltipLeft = rect.left + rect.width / 2 - tooltipW / 2;
  let tooltipTop = step.placement === 'bottom'
    ? rect.bottom + PAD + 12
    : rect.top - tooltipH - PAD - 12;

  // clamp horizontally
  tooltipLeft = Math.max(12, Math.min(tooltipLeft, window.innerWidth - tooltipW - 12));

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Dark overlay with spotlight cutout */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none',
            }}
          >
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={rect.left - PAD} y={rect.top - PAD}
                    width={rect.width + PAD * 2} height={rect.height + PAD * 2}
                    rx={10} fill="black"
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spotlight-mask)" />
            </svg>

            {/* Accent border around target */}
            <motion.div
              key={`border-${cur}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                left: rect.left - PAD, top: rect.top - PAD,
                width: rect.width + PAD * 2, height: rect.height + PAD * 2,
                borderRadius: 10,
                border: '2px solid #00d4c8',
                boxShadow: '0 0 0 4px rgba(0,212,200,0.15)',
                pointerEvents: 'none',
              }}
            />
          </motion.div>

          {/* Clickable overlay to close */}
          <div
            onClick={dismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'default' }}
          />

          {/* Tooltip */}
          <motion.div
            key={`tooltip-${cur}`}
            initial={{ opacity: 0, y: step.placement === 'bottom' ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: tooltipLeft,
              top: tooltipTop,
              width: tooltipW,
              zIndex: 9999,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            {/* Arrow */}
            <div style={{
              position: 'absolute',
              left: '50%', transform: 'translateX(-50%)',
              [step.placement === 'bottom' ? 'top' : 'bottom']: -6,
              width: 10, height: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRight: step.placement === 'bottom' ? 'none' : undefined,
              borderBottom: step.placement === 'bottom' ? 'none' : undefined,
              borderTop: step.placement === 'top' ? 'none' : undefined,
              borderLeft: step.placement === 'top' ? 'none' : undefined,
              transform: step.placement === 'bottom'
                ? 'translateX(-50%) rotate(45deg)'
                : 'translateX(-50%) rotate(225deg)',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{
                background: 'rgba(0,212,200,0.12)', border: '1px solid rgba(0,212,200,0.25)',
                color: '#00d4c8', fontSize: 10, fontWeight: 600,
                padding: '2px 8px', borderRadius: 10, letterSpacing: '0.06em',
              }}>
                {cur + 1} / {STEPS.length}
              </div>
            </div>

            <div style={{ fontFamily: 'Georgia, serif', fontSize: 14.5, color: 'var(--fg)', marginBottom: 6, lineHeight: 1.35 }}>
              {step.title}
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.75, margin: '0 0 14px' }}>
              {step.desc}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i === cur ? 14 : 5, height: 5,
                    borderRadius: i === cur ? 2.5 : '50%',
                    background: i === cur ? '#00d4c8' : 'var(--border-strong)',
                    transition: 'all 0.2s',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={dismiss} style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--fg-4)', padding: '5px 12px', borderRadius: 7,
                  fontSize: 11, cursor: 'pointer',
                }}>
                  Skip
                </button>
                {cur > 0 && (
                  <button onClick={() => setCur(c => c - 1)} style={{
                    background: 'var(--surface-raised)', border: '1px solid var(--border)',
                    color: 'var(--fg-2)', padding: '5px 12px', borderRadius: 7,
                    fontSize: 11, cursor: 'pointer',
                  }}>
                    Back
                  </button>
                )}
                <button onClick={next} style={{
                  background: '#00d4c8', border: 'none',
                  color: '#0c0c0e', padding: '5px 14px', borderRadius: 7,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  {isLast ? 'Got it' : 'Next →'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
