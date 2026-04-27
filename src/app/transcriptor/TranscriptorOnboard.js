'use client';

import OnboardModal from '../OnboardModal';

function UploadVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 24 }}>
      <div style={{
        width: 220, border: '2px dashed rgba(0,212,200,0.35)',
        borderRadius: 12, padding: '18px 20px',
        background: 'rgba(0,212,200,0.04)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <svg viewBox="0 0 24 24" style={{ width: 26, height: 26, stroke: '#00d4c8', fill: 'none', strokeWidth: 1.6, flexShrink: 0 }}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
        </svg>
        <div style={{ fontSize: 11.5, color: 'var(--fg-2)', lineHeight: 1.6 }}>
          Drop any audio file<br />
          <span style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>MP3, WAV, M4A, FLAC</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Max 500MB per file</div>
    </div>
  );
}

function ModelVisual() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '20px 28px' }}>
      {[
        { name: 'Whisper v3 Turbo', tag: 'Fast', price: '฿7', color: '#00d4c8', active: true, desc: 'Good accuracy, 2x faster' },
        { name: 'Whisper v3 Large', tag: 'Premium', price: '฿11', color: '#a78bfa', active: false, desc: 'Best accuracy, dense audio' },
      ].map(m => (
        <div key={m.name} style={{
          flex: 1, borderRadius: 10,
          border: `1px solid ${m.active ? m.color + '45' : 'var(--border)'}`,
          background: m.active ? m.color + '0d' : 'var(--surface-deep)',
          padding: '12px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: m.color, background: m.color + '18', border: `1px solid ${m.color}30`, padding: '2px 7px', borderRadius: 8 }}>{m.tag}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: m.active ? m.color : 'var(--fg-3)' }}>{m.price}</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginBottom: 4 }}>{m.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-4)', lineHeight: 1.5 }}>{m.desc}</div>
        </div>
      ))}
    </div>
  );
}

function OutputVisual() {
  return (
    <div style={{ padding: '20px 28px', width: '100%' }}>
      <div style={{
        background: 'var(--surface-deep)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Transcript output</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            'So today we are going to look at the security',
            'requirements that need to be considered during',
            'the design phase of the SDLC...',
          ].map((line, i) => (
            <div key={i} style={{ fontSize: 12, color: i < 2 ? 'var(--fg-2)' : 'var(--fg-4)', lineHeight: 1.6 }}>{line}</div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <div style={{ background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)', color: '#00d4c8', fontSize: 10, padding: '2px 8px', borderRadius: 6 }}>Plain text</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-4)', fontSize: 10, padding: '2px 8px', borderRadius: 6 }}>With timestamps</div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    label: 'Input',
    title: 'Drop your audio file',
    desc: 'Upload any audio recording — lecture, meeting, voice memo. MP3, WAV, M4A, and FLAC all work. If your file is in a video format, run it through the Audio Converter first.',
    visual: <UploadVisual />,
  },
  {
    label: 'Model',
    title: 'Pick your transcription model',
    desc: 'Turbo (฿7) is fast and accurate for most lectures. Large (฿11) handles heavy accents, technical jargon, and overlapping speech significantly better. When in doubt, use Turbo first.',
    visual: <ModelVisual />,
  },
  {
    label: 'Output',
    title: 'Get your transcript — then use it anywhere',
    desc: 'You get clean plain text or timestamped output. From there, paste it into Inclass Notes to generate structured notes, or export it directly. Transcripts are saved to your history.',
    visual: <OutputVisual />,
  },
];

export default function TranscriptorOnboard() {
  return <OnboardModal storageKey="onboarded_transcriptor" slides={SLIDES} />;
}
