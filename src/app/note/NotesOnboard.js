'use client';

import OnboardModal from '../OnboardModal';

// ─── Visual helpers ────────────────────────────────────────────────────────────
function UploadVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
      <div style={{
        width: 200, border: '2px dashed rgba(0,212,200,0.35)',
        borderRadius: 12, padding: '20px 24px',
        background: 'rgba(0,212,200,0.04)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, stroke: '#00d4c8', fill: 'none', strokeWidth: 1.6 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={{ fontSize: 12, color: 'var(--fg-2)', textAlign: 'center', lineHeight: 1.6 }}>
          Drop audio file or<br />paste transcript text
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['MP3', 'WAV', 'M4A', 'TXT'].map(f => (
          <span key={f} style={{
            background: 'var(--surface-deep)', border: '1px solid var(--border)',
            color: 'var(--fg-3)', fontSize: 10, padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace',
          }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function StyleVisual() {
  const styles = [
    { name: 'Exam Note', color: '#f97316', desc: 'Every detail' },
    { name: 'Standard', color: '#00d4c8', desc: 'Core concepts', active: true },
    { name: 'Textbook', color: '#a78bfa', desc: 'Academic prose' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, padding: 24 }}>
      {styles.map(s => (
        <div key={s.name} style={{
          flex: 1, borderRadius: 10,
          border: `1px solid ${s.active ? s.color + '50' : 'var(--border)'}`,
          background: s.active ? s.color + '0d' : 'var(--surface-deep)',
          padding: '12px 10px',
          display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
          transform: s.active ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.2s',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: s.color,
            background: s.color + '18', border: `1px solid ${s.color}35`,
            padding: '2px 8px', borderRadius: 10,
          }}>{s.name}</div>
          <div style={{ fontSize: 10, color: 'var(--fg-4)', textAlign: 'center' }}>{s.desc}</div>
          {[80, 65, 90, 55].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w}%`, borderRadius: 2, background: s.active ? s.color + '30' : 'var(--border)' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function GenerateVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 28, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#00d4c8',
          boxShadow: '0 0 8px #00d4c8',
        }} />
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'linear-gradient(90deg, #00d4c8 70%, var(--border) 70%)' }} />
        <div style={{ fontSize: 10, color: '#00d4c8', fontFamily: 'monospace' }}>73%</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Structuring your notes...</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { label: '✓ Reading transcript', done: true },
          { label: '✓ Identifying key concepts', done: true },
          { label: '⟳ Structuring sections', done: false },
          { label: '  Writing callouts', done: false, dim: true },
        ].map((s, i) => (
          <div key={i} style={{
            fontSize: 11,
            color: s.done ? 'var(--fg-2)' : s.dim ? 'var(--fg-4)' : '#00d4c8',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slides ────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    label: 'Input',
    title: 'Upload your audio or paste your transcript',
    desc: 'Drop an MP3, WAV, or M4A recording — or paste a .txt transcript directly. If you have raw audio, use the Audio Converter first to clean it up.',
    visual: <UploadVisual />,
  },
  {
    label: 'Style',
    title: 'Pick your note style',
    desc: 'Exam Note captures every detail and lecturer callout. Standard gives you clean bullet points. Textbook writes in structured academic prose. You choose based on how you study.',
    visual: <StyleVisual />,
  },
  {
    label: 'Generate',
    title: 'Hit generate and wait about a minute',
    desc: 'Eidolon reads your source, identifies key concepts, and structures them into a formatted note. Most notes finish in under 60 seconds. Cost: ฿9–17 depending on length.',
    visual: <GenerateVisual />,
  },
];

export default function NotesOnboard() {
  return <OnboardModal storageKey="onboarded_notes" slides={SLIDES} />;
}
