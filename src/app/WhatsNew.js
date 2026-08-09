'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHANGELOG, LATEST_VERSION } from '@/lib/changelog';

const STORAGE_KEY = 'eidolon_changelog_seen';

const SECTION_CONFIG = {
  new:      { label: 'New',      color: 'text-[var(--accent)]',  border: 'border-[rgba(0,212,200,0.25)]',  bg: 'bg-[rgba(0,212,200,0.07)]'  },
  improved: { label: 'Improved', color: 'text-[#a78bfa]',        border: 'border-[rgba(139,92,246,0.25)]', bg: 'bg-[rgba(139,92,246,0.07)]' },
  fixed:    { label: 'Fixed',    color: 'text-[#f59e0b]',        border: 'border-[rgba(245,158,11,0.25)]', bg: 'bg-[rgba(245,158,11,0.07)]' },
};

export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    setHasUnread(seen !== LATEST_VERSION);
  }, []);

  const openModal = () => {
    setOpen(true);
    setHasUnread(false);
    localStorage.setItem(STORAGE_KEY, LATEST_VERSION);
  };

  return (
    <>
      {/* Navbar button */}
      <button
        onClick={openModal}
        title="What's new"
        data-onboard="nav-whats-new"
        className="btn-icon group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all"
      >
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[var(--fg-3)] fill-none stroke-[1.8] transition-colors group-hover:stroke-[var(--accent)]">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface-raised)]" />
        )}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="wn-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="wn-panel"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-[480px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl shadow-black/50 surface"
                onClick={e => e.stopPropagation()}
              >
                {/* Accent bar */}
                <div className="h-[3px] rounded-t-2xl bg-[var(--accent)] opacity-80" />

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
                  <div>
                    <div className="font-serif text-[18px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                      What&apos;s new
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="rounded border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.07)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent)]">
                        v{LATEST_VERSION}
                      </span>
                      <span className="text-[11px] text-[var(--fg-4)]">{CHANGELOG.length} releases</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="btn-icon-danger group flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--fg-3)] fill-none stroke-[2] transition-colors group-hover:stroke-[#ef4444]">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Entries */}
                <div className="px-6 py-5 flex flex-col gap-6">
                  {CHANGELOG.map((release, releaseIndex) => (
                    <div
                      key={release.version}
                      className={`flex flex-col gap-5 ${releaseIndex > 0 ? 'border-t border-[var(--border)] pt-5' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.07)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent)]">
                            v{release.version}
                          </span>
                          <span className="text-[11px] text-[var(--fg-4)]">{release.date}</span>
                        </div>
                        {releaseIndex === 0 && (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--fg-3)]">
                            Latest
                          </span>
                        )}
                      </div>

                      {(['new', 'improved', 'fixed']).map(section => {
                        const entries = release[section];
                        if (!entries?.length) return null;
                        const cfg = SECTION_CONFIG[section];
                        return (
                          <div key={`${release.version}-${section}`}>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 mb-3 text-[10px] font-semibold uppercase tracking-[0.07em] ${cfg.color} ${cfg.border} ${cfg.bg}`}>
                              {cfg.label}
                            </span>
                            <ul className="flex flex-col gap-2.5">
                              {entries.map((entry, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                  <span className={`mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.color.replace('text-', 'bg-')}`} style={{ background: 'currentColor' }} />
                                  <span className="text-[13px] leading-[1.65] text-[var(--fg-2)]">{entry}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-[11.5px] text-[var(--fg-4)] leading-relaxed">
                    More updates ship regularly. This panel will badge when something new lands.
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
