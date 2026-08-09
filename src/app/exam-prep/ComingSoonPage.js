'use client';

import Navbar from '../navbar';
import Sidebar from '../sidebar';

export default function ExamPrepComingSoonPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-8 py-12 text-center surface noise">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: 'radial-gradient(circle at 50% 0%, rgba(0,212,200,0.10), transparent 52%)' }}
            />
            <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(0,212,200,0.22)] bg-[rgba(0,212,200,0.07)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[var(--accent)] stroke-[1.8]">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="relative mb-3 inline-flex rounded-full border border-[rgba(0,212,200,0.22)] bg-[rgba(0,212,200,0.07)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              Coming Soon
            </div>
            <h1 className="relative font-serif text-[28px] font-normal tracking-[-0.02em] text-[var(--fg)]">
              Exam Prep
            </h1>
            <p className="relative mx-auto mt-3 max-w-md text-[13px] leading-7 text-[var(--fg-3)]">
              Exam Prep is being prepared for a future release. Generation, unlocking, and editing are unavailable for now.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
