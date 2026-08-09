'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import ConfirmModal from '@/app/ConfirmModal';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';
import LocalCreditPrice from '@/app/LocalCreditPrice';
import { useTranslations, useLocale } from 'next-intl';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCreatedAt(ts, locale) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString(locale || 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatWordCount(content, t) {
  if (!content) return '—';
  return content.trim().split(/\s+/).length.toLocaleString() + ' ' + (t ? t('words') : 'words');
}

function formatTranscriptContent(tx) {
  if (tx.segments && tx.output_format === 'verbose_json') {
    try {
      const segments = typeof tx.segments === 'string'
        ? JSON.parse(tx.segments)
        : tx.segments;

      if (Array.isArray(segments) && segments.length > 0) {
        return segments.map(segment => {
          const startTime = formatTime(segment.start);
          const endTime = formatTime(segment.end);
          const speaker = segment.speaker_id ? `${segment.speaker_id}: ` : '';
          return `[${startTime} → ${endTime}]\n${speaker}${segment.text}`;
        }).join('\n\n');
      }
    } catch (e) {
      return tx.content;
    }
  }
  return tx.content;
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

// ─── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick, icon, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[12px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed
        ${danger ? 'hover:!border-[rgba(239,68,68,0.3)] hover:!text-[#ef4444]' : ''}`}
    >
      {icon}{children}
    </button>
  );
}

// ─── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{label}</div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)]">
        {value}
      </div>
    </div>
  );
}

function normalizeTranscriptModel(model) {
  const value = String(model || '').toLowerCase();
  if (value.includes('turbo')) return 'turbo';
  if (value.includes('large-v3') || value.includes('whisper-v3') || value.includes('premium')) return 'premium';
  return 'unknown';
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function TranscriptSkeleton() {
  return (
    <main className="flex flex-1 overflow-hidden min-w-0">
      {/* Left panel */}
      <div className="flex w-[300px] flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border)]">
        <div className="flex-shrink-0 border-b border-[var(--border)] px-[22px] pb-[18px] pt-[22px] flex flex-col gap-2">
          <div className="skeleton h-6 w-40 rounded-lg" />
          <div className="skeleton h-3 w-52 rounded" />
        </div>
        <div className="flex flex-1 flex-col gap-4 px-[22px] py-[18px]">
          <div className="skeleton h-16 w-full rounded-xl" />
          {[null, null, null].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="skeleton h-2.5 w-20 rounded" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          ))}
          <div className="skeleton h-28 w-full rounded-xl" />
        </div>
      </div>
      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-[22px] py-4">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="flex gap-1.5">
            {[52, 80, 52].map((w, i) => (
              <div key={i} className="skeleton h-7 rounded-lg" style={{ width: w }} />
            ))}
          </div>
        </div>
        <div className="flex-1 px-8 py-7 flex flex-col gap-3">
          <div className="flex gap-3 mb-3">
            {[120, 60, 80].map((w, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="skeleton h-4 rounded" style={{ width: i % 3 === 2 ? '70%' : '100%' }} />
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TranscriptViewer({ params }) {
  const router = useRouter();
  const { getAccessTokenSilently } = useAuth0();
  const intervalRef = useRef(null);
  const { id } = use(params);
  const t = useTranslations('transcriptor');
  const locale = useLocale();

  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(false);

  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch_ = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`/api/transcript/getDetail/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setTx(data.detail);
        setEditLabel(data.detail.label ?? '');
        setEditContent(formatTranscriptContent(data.detail));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [id, getAccessTokenSilently, router]);

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/transcript/unlock', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error ?? t('errorUnlockFailed'));
        return;
      }
      window.location.reload();
    } catch {
      setUnlockError(t('errorGeneric'));
    } finally {
      setUnlocking(false);
    }
  };

  const copyTranscript = async () => {
    const copied = await copyToClipboard(formatTranscriptContent(tx));
    if (!copied) return;
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const downloadTranscript = () => {
    if (!tx?.content) return;
    const blob = new Blob([tx.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tx.label ?? 'transcript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/transcript/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteModal(false);
        setDeleteError(data.error);
        setDeleting(false);
        return;
      }
      router.push('/transcriptor');
    } catch {
      setDeleteModal(false);
      setDeleteError(t('errorDelete'));
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessTokenSilently();
      const wasSegmented = tx.output_format === 'verbose_json';
      const res = await fetch('/api/transcript/edit', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id, label: editLabel, content: editContent, clearSegments: wasSegmented }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTx(prev => ({
        ...prev,
        label: editLabel,
        content: editContent,
        ...(wasSegmented ? { output_format: 'text', segments: null } : {}),
      }));
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditLabel(tx.label ?? '');
    setEditContent(formatTranscriptContent(tx));
    setIsEditing(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Error state */}
        {!loading && error && (
          <main className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-[14px] font-medium text-[var(--fg)]">{t('failedToLoad')}</div>
              <div className="mb-4 text-[12px] text-[var(--fg-3)]">{error}</div>
              <button onClick={() => router.push('/transcriptor')}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-[13px] text-[var(--fg-2)] transition-all hover:text-[var(--fg)]">
                {t('backToTranscriptor')}
              </button>
            </div>
          </main>
        )}

        {/* Loading skeleton */}
        {loading && <TranscriptSkeleton />}

        {/* Content */}
        {!loading && tx && (
          <motion.main
            className="flex flex-1 overflow-hidden min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Main Content Area */}
            <div className="relative flex flex-1 overflow-hidden min-h-0">
                {!tx.is_unlocked && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-md">
                    <div className="flex flex-col items-center p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-[400px]">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(168,85,247,0.1)] mb-4">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-[#a855f7] fill-none stroke-[2]">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                      <h2 className="text-[18px] font-semibold text-[var(--fg)] mb-2">Locked Group Transcript</h2>
                      <p className="text-[13px] text-[var(--fg-3)] mb-6">
                        This transcript was generated by your group. You can unlock it for {tx.unlock_price ?? tx.charge_amount} credits{' '}
                        <LocalCreditPrice credits={tx.unlock_price ?? tx.charge_amount} /> to view its contents.
                      </p>
                      {unlockError && (
                        <div className="mb-4 text-[12.5px] text-[#ef4444] bg-[#ef4444]/10 px-3 py-2 rounded-lg">
                          {unlockError}
                        </div>
                      )}
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="btn-accent w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium"
                      >
                        {unlocking ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        ) : (
                          <>Unlock for {tx.unlock_price ?? tx.charge_amount} <CreditIcon size={13} /> <LocalCreditPrice credits={tx.unlock_price ?? tx.charge_amount} /></>
                        )}
                      </button>
                    </div>
                  </div>
                )}

            {/* ── Left panel ── */}
            <div className="flex w-[300px] flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-faint)]">

              {/* Header */}
              <div className="flex-shrink-0 border-b border-[var(--border)] px-[22px] pb-[18px] pt-[22px]">
                <div className="font-serif text-[19px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                  {t('transcriptDetails')}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{t('sourceInfo')}</div>
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] py-[18px]"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>

                {/* Source file card */}
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 surface noise">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--fg)]">{tx.filename}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--fg-3)]">
                      {tx.filename?.split('.').pop().toUpperCase()} · {formatDuration(tx.duration)}
                    </div>
                  </div>
                </div>

                <DetailRow label={t('formatType')} value={tx.output_format === 'verbose_json' ? t('formatSegmented') : tx.output_format === 'text' ? t('formatText') : tx.output_format ?? '—'} />
                <DetailRow label={t('transcriptionModel')} value={normalizeTranscriptModel(tx.model) === 'premium' ? t('whisperLargeV3') : normalizeTranscriptModel(tx.model) === 'turbo' ? t('whisperLargeV3Turbo') : tx.model ?? '-'} />
                <DetailRow label={t('createdAt')} value={formatCreatedAt(tx.created_at, locale)} />
                <DetailRow label={t('wordCount')} value={formatWordCount(tx.content, t)} />

                {/* Cost breakdown */}
                <div className="flex flex-col gap-1.5 rounded-xl border border-[rgba(0,212,200,0.1)] bg-[var(--surface)] px-4 py-3.5 mt-2 surface-teal">
                  <div className="pb-1 text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('costBreakdown')}</div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--fg-3)]">{t('duration')}</span>
                    <span className="font-mono text-[12px] text-[var(--fg)]">{formatDuration(tx.duration)}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--fg-3)]">{t('rate')}</span>
                    <span className="font-mono text-[12px] text-[var(--fg)]">
                      <CreditIcon size={12} className='mr-1' color='#b4b4c2' />{normalizeTranscriptModel(tx.model) === 'turbo' ? '2.4/hr' : normalizeTranscriptModel(tx.model) === 'premium' ? '5.4/hr' : '—'}
                      {normalizeTranscriptModel(tx.model) === 'turbo' && <LocalCreditPrice credits={2.4} suffix="/hr" className="ml-1" />}
                      {normalizeTranscriptModel(tx.model) === 'premium' && <LocalCreditPrice credits={5.4} suffix="/hr" className="ml-1" />}
                    </span>
                  </div>
                  <div className="h-px bg-[var(--surface-tint)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium text-[var(--fg-2)]">{t('totalCharged')}</span>
                    {tx.is_trial ? (
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-[11px] font-medium text-[var(--fg-4)] line-through decoration-1 leading-none mb-0.5">
                          {tx.charge_amount} <CreditIcon size={10} className='opacity-50 inline-block mb-0.5' />
                        </span>
                        <LocalCreditPrice credits={tx.charge_amount} className="mt-0.5" />
                        <span className="font-mono text-[14px] font-bold text-[#22c55e] leading-none uppercase tracking-wide">
                          TRIAL
                        </span>
                      </div>
                    ) : (
                      <span className="flex flex-col items-end font-mono text-[16px] font-medium text-[var(--accent)]">
                        <span>{tx.charge_amount} <CreditIcon size={16} className='mr-1' /></span>
                        <LocalCreditPrice credits={tx.charge_amount} className="mt-0.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">

              {/* Viewer header */}
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-[22px] py-4 bg-[var(--surface)] nav-surface">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); if (e.key === 'Enter') handleSave(); }}
                      className="flex-1 min-w-0 rounded-lg border border-[rgba(0,212,200,0.35)] bg-[var(--surface-raised)] px-3 py-1.5 text-[13px] font-medium text-[var(--fg)] outline-none transition-colors"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="truncate text-[13px] font-medium text-[var(--fg)]">{tx.label}</span>
                      <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                        <div className="h-[5px] w-[5px] rounded-full bg-current flex-shrink-0" />
                        {t('completed')}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <ActionBtn onClick={cancelEdit} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      }>Cancel</ActionBtn>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.08)] px-3 py-1.5 text-[12px] text-[var(--accent)] transition-all hover:bg-[rgba(0,212,200,0.14)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                          </svg>
                        )}
                        {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      {tx.can_edit && (
                        <ActionBtn onClick={() => setIsEditing(true)} icon={
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        }>Edit</ActionBtn>
                      )}
                      <ActionBtn onClick={copyTranscript} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      }>{t('copy')}</ActionBtn>
                      <ActionBtn onClick={downloadTranscript} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      }>{t('download')}</ActionBtn>
                      {tx.generation_type !== 'group' && (
                        <ActionBtn danger onClick={() => setDeleteModal(true)} icon={
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4h6v2" />
                          </svg>
                        }>{deleting ? t('deleting') : t('delete')}</ActionBtn>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Viewer body */}
              <div
                className="flex-1 overflow-y-auto px-10 py-7"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
              >
                {/* Meta chips */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {[
                    {
                      label: formatCreatedAt(tx.created_at),
                      icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
                    },
                    {
                      label: formatDuration(tx.duration),
                      icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                    },
                    {
                      label: formatWordCount(tx.content),
                      icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="15" y2="18" /></svg>,
                    },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                      {m.icon}{m.label}
                    </div>
                  ))}
                </div>

                {/* Transcript content */}
                {isEditing ? (
                  <div className="flex flex-col gap-4 max-w-[800px]">
                    {tx.output_format === 'verbose_json' && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] px-4 py-3">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 stroke-[#f59e0b] fill-none stroke-[1.8]">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <p className="text-[12px] leading-[1.7] text-[#f59e0b]">
                          Saving will convert this to plain text — timestamps are preserved in the text but the structured segment data will be removed.
                        </p>
                      </div>
                    )}
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="w-full resize-none bg-transparent text-[14px] leading-[2] text-[var(--fg-body)] outline-none"
                      style={{ minHeight: tx.output_format === 'verbose_json' ? 'calc(100vh - 260px)' : 'calc(100vh - 180px)', border: 'none', scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                    />
                  </div>
                ) : (
                  <div className="max-w-[800px] text-[14px] leading-[2] text-[var(--fg-body)] whitespace-pre-wrap">
                    {formatTranscriptContent(tx)}
                  </div>
                )}
              </div>
            </div>
            </div>

          </motion.main>
        )}
      </div>

      <AnimatePresence>
        {deleteError && <ErrorModal message={deleteError} onClose={() => setDeleteError(null)} />}
        {deleteModal && (
          <ConfirmModal
            title={t('deleteTranscript')}
            message={t('deleteTranscriptConfirm')}
            confirmLabel={t('delete')}
            loadingLabel={t('deleting')}
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => { if (!deleting) setDeleteModal(false); }}
          />
        )}
      </AnimatePresence>

      {/* Copy toast */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-[12.5px] text-[var(--fg-2)] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t('copiedToClipboard')}
      </div>
    </div>
  );
}
