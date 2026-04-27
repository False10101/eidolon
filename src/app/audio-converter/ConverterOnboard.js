'use client';

import OnboardModal from '../OnboardModal';

function UploadVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 24 }}>
      <div style={{
        width: 230, border: '2px dashed rgba(0,212,200,0.3)', borderRadius: 12,
        padding: '16px 20px', background: 'rgba(0,212,200,0.03)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <svg viewBox="0 0 24 24" style={{ width: 26, height: 26, stroke: '#00d4c8', fill: 'none', strokeWidth: 1.6, flexShrink: 0 }}>
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 3 }}>Drop any audio or video</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>MP4, MKV, MP3, WAV, M4A...</div>
        </div>
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
        color: '#22c55e', fontSize: 11, padding: '3px 12px', borderRadius: 10,
      }}>
        FREE — no credits needed
      </div>
    </div>
  );
}

function FormatVisual() {
  return (
    <div style={{ padding: '16px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['MP3', 'WAV', 'M4A'].map((f, i) => (
          <div key={f} style={{
            flex: 1, borderRadius: 8,
            border: `1px solid ${i === 0 ? 'rgba(0,212,200,0.4)' : 'var(--border)'}`,
            background: i === 0 ? 'rgba(0,212,200,0.08)' : 'var(--surface-deep)',
            padding: '10px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? '#00d4c8' : 'var(--fg-3)', marginBottom: 3 }}>{f}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-4)' }}>{['Universal', 'Lossless', 'Apple'][i]}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>Bitrate</div>
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {['128 kbps', '192 kbps', '256 kbps'].map((b, i) => (
            <div key={b} style={{
              flex: 1, padding: '4px 0', textAlign: 'center', borderRadius: 6, fontSize: 10.5,
              border: `1px solid ${i === 1 ? 'rgba(0,212,200,0.3)' : 'var(--border)'}`,
              background: i === 1 ? 'rgba(0,212,200,0.06)' : 'transparent',
              color: i === 1 ? '#00d4c8' : 'var(--fg-4)',
            }}>{b}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{
          width: 14, height: 14, borderRadius: 3,
          border: '1px solid var(--border)', background: 'var(--surface-deep)',
          flexShrink: 0,
        }} />
        <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Optional trim: cut start/end timestamps</div>
      </div>
    </div>
  );
}

function ChainVisual() {
  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { icon: '↓', label: 'Download converted file', active: false },
        { icon: '→', label: 'Send straight to Transcriptor', active: true, sub: 'Skips re-upload — saves time' },
      ].map(opt => (
        <div key={opt.label} style={{
          borderRadius: 9, padding: '10px 14px',
          border: `1px solid ${opt.active ? 'rgba(0,212,200,0.35)' : 'var(--border)'}`,
          background: opt.active ? 'rgba(0,212,200,0.06)' : 'var(--surface-deep)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: opt.active ? 'rgba(0,212,200,0.12)' : 'var(--surface)',
            border: `1px solid ${opt.active ? 'rgba(0,212,200,0.25)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: opt.active ? '#00d4c8' : 'var(--fg-4)',
          }}>{opt.icon}</div>
          <div>
            <div style={{ fontSize: 12, color: opt.active ? 'var(--fg)' : 'var(--fg-3)' }}>{opt.label}</div>
            {opt.sub && <div style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{opt.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const SLIDES = [
  {
    label: 'Input',
    title: 'Drop any audio or video file — it\'s free',
    desc: 'Audio Converter costs zero credits. Upload any format — MP4 lecture recordings, MKV, MP3, anything. It strips the audio track and gives you a clean file.',
    visual: <UploadVisual />,
  },
  {
    label: 'Config',
    title: 'Pick your output format and quality',
    desc: 'MP3 at 192kbps is the sweet spot for voice recordings. Use WAV if you need lossless for editing. Trim start and end timestamps if you want to cut out dead air before or after the lecture.',
    visual: <FormatVisual />,
  },
  {
    label: 'Output',
    title: 'Download or chain straight into transcription',
    desc: 'After conversion you can download the file, or send it directly to Transcriptor without re-uploading. That makes the full pipeline — convert → transcribe → notes — seamless.',
    visual: <ChainVisual />,
  },
];

export default function ConverterOnboard() {
  return <OnboardModal storageKey="onboarded_converter" slides={SLIDES} />;
}
