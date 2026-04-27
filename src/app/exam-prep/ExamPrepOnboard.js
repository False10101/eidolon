'use client';

import OnboardModal from "../OnboardModal";

function SourcesVisual() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '18px 24px', width: '100%' }}>
      {/* Notes picker */}
      <div style={{
        flex: 1, borderRadius: 10,
        border: '1px solid rgba(0,212,200,0.3)',
        background: 'rgba(0,212,200,0.05)',
        padding: '12px',
      }}>
        <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 8 }}>From your notes</div>
        {['Security Lecture 6', 'Network Design Wk3'].map((n, i) => (
          <div key={n} style={{
            display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
            borderRadius: 6, padding: '5px 8px',
            border: `1px solid ${i === 0 ? 'rgba(0,212,200,0.3)' : 'var(--border)'}`,
            background: i === 0 ? 'rgba(0,212,200,0.06)' : 'var(--surface)',
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
              background: i === 0 ? '#00d4c8' : 'transparent',
              border: i === 0 ? 'none' : '1px solid var(--border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {i === 0 && <div style={{ width: 5, height: 3, border: '1.5px solid #0c0c0e', borderTop: 'none', borderRight: 'none', transform: 'rotate(-45deg) translateY(-1px)' }} />}
            </div>
            <span style={{ fontSize: 10.5, color: i === 0 ? 'var(--fg)' : 'var(--fg-3)' }}>{n}</span>
          </div>
        ))}
      </div>
      {/* Or */}
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--fg-4)' }}>or</div>
      {/* Upload */}
      <div style={{
        flex: 1, borderRadius: 10,
        border: '1px dashed var(--border-strong)',
        background: 'var(--surface-deep)',
        padding: '12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: 'var(--fg-4)', fill: 'none', strokeWidth: 1.6 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={{ fontSize: 10.5, color: 'var(--fg-4)', textAlign: 'center' }}>Upload .txt file</div>
      </div>
    </div>
  );
}

function ConfigVisual() {
  const types = ['T/F', 'MCQ', 'Theory', 'Scenario', 'Calc'];
  return (
    <div style={{ padding: '16px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 7 }}>Question types</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {types.map((t, i) => (
            <div key={t} style={{
              padding: '4px 10px', borderRadius: 7, fontSize: 11,
              border: `1px solid ${i < 4 ? 'rgba(0,212,200,0.3)' : 'var(--border)'}`,
              background: i < 4 ? 'rgba(0,212,200,0.07)' : 'var(--surface-deep)',
              color: i < 4 ? '#00d4c8' : 'var(--fg-4)',
            }}>{t}</div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 7 }}>Difficulty</div>
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {['Easy', 'Normal', 'Hard'].map((d, i) => (
            <div key={d} style={{
              flex: 1, padding: '6px 0', textAlign: 'center', fontSize: 11,
              background: i === 1 ? 'var(--surface-deep)' : 'transparent',
              color: i === 1 ? 'var(--fg)' : 'var(--fg-4)',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}>{d}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutputVisual() {
  return (
    <div style={{ padding: '16px 28px', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { q: 'Q1. What is the primary difference between a design fraud and a bug?', type: 'Theory', color: '#f59e0b' },
        { q: 'Q2. The shift-left paradigm suggests fixing defects late in SDLC saves cost. True or False?', type: 'T/F', color: '#00d4c8' },
        { q: 'Q3. A system is deployed with missing input validation...', type: 'Scenario', color: '#a78bfa', truncate: true },
      ].map((q) => (
        <div key={q.q} style={{
          borderRadius: 8, padding: '8px 10px',
          border: '1px solid var(--border)',
          background: 'var(--surface-deep)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 9.5, color: q.color, background: q.color + '18', padding: '1px 6px', borderRadius: 5 }}>{q.type}</div>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            {q.truncate ? q.q.slice(0, 42) + '...' : q.q.slice(0, 55)}
          </div>
        </div>
      ))}
    </div>
  );
}

const SLIDES = [
  {
    label: 'Sources',
    title: 'Pick your source — existing notes or raw text',
    desc: 'Select notes you\'ve already generated in Eidolon, or upload a raw .txt file. You can mix both — pull from multiple notes and files at once for a comprehensive exam set.',
    visual: <SourcesVisual />,
  },
  {
    label: 'Config',
    title: 'Choose question types and difficulty',
    desc: 'Mix T/F, MCQ, Theory, Scenario, and Calculation questions. Set difficulty to Easy, Normal, or Hard. Individual mode generates one set per source; Group mode synthesizes everything into one.',
    visual: <ConfigVisual />,
  },
  {
    label: 'Output',
    title: 'Get a full exam question set with answers',
    desc: 'Exam Prep generates questions, model answers, and explanations. Great for self-testing before exams. Cost is 17–37 credits depending on how much source material you feed in.',
    visual: <OutputVisual />,
  },
];

export default function ExamPrepOnboard() {
  return <OnboardModal storageKey="onboarded_exam" slides={SLIDES} accentColor="#f97316" />;
}
