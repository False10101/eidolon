'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── OnboardModal ──────────────────────────────────────────────────────────────
// Shared modal shell used by Notes, Transcriptor, Audio Converter, Exam Prep.
// Props:
//   storageKey  string   localStorage key e.g. 'onboarded_notes'
//   slides      array    { icon, title, desc, visual: ReactNode }
//   accentColor string   optional override, defaults to var(--accent)
// ──────────────────────────────────────────────────────────────────────────────

export default function OnboardModal({ storageKey, slides, accentColor = '#00d4c8' }) {
  const [visible, setVisible] = useState(false);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(storageKey)) {
      setVisible(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  const next = () => {
    if (cur < slides.length - 1) setCur(c => c + 1);
    else dismiss();
  };

  const prev = () => {
    if (cur > 0) setCur(c => c - 1);
  };

  if (!visible) return null;

  const slide = slides[cur];
  const isLast = cur === slides.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed', zIndex: 9999,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 480,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            {/* Accent top bar */}
            <div style={{ height: 3, background: accentColor, opacity: 0.8 }} />

            {/* Visual area */}
            <div style={{
              height: 180,
              background: 'var(--surface-raised)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={cur}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {slide.visual}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px 0' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={cur}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                  }}>
                    <div style={{
                      background: `${accentColor}18`,
                      border: `1px solid ${accentColor}40`,
                      color: accentColor,
                      fontSize: 10, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 10,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {cur + 1} of {slides.length}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{slide.label}</div>
                  </div>

                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: 'var(--fg)', marginBottom: 8, lineHeight: 1.35 }}>
                    {slide.title}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.75, margin: 0 }}>
                    {slide.desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px 20px',
            }}>
              {/* Dots */}
              <div style={{ display: 'flex', gap: 5 }}>
                {slides.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCur(i)}
                    style={{
                      width: i === cur ? 18 : 6, height: 6,
                      borderRadius: i === cur ? 3 : '50%',
                      background: i === cur ? accentColor : 'var(--border-strong)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={dismiss}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-strong)',
                    color: 'var(--fg-3)', padding: '7px 16px', borderRadius: 8,
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Skip
                </button>
                {cur > 0 && (
                  <button
                    onClick={prev}
                    style={{
                      background: 'var(--surface-raised)', border: '1px solid var(--border)',
                      color: 'var(--fg-2)', padding: '7px 16px', borderRadius: 8,
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  style={{
                    background: accentColor, border: 'none',
                    color: '#0c0c0e', padding: '7px 20px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {isLast ? 'Get started' : 'Next →'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
