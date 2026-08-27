'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import MDEditor from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import GeneratingOverlay from '@/app/GeneratingOverlays';
import ConfirmModal from '@/app/ConfirmModal';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';
import LocalCreditPrice from '@/app/LocalCreditPrice';
import CategorizationModal from '@/app/CategorizationModal';
import CategoryDropdown from '@/app/CategoryDropdown';
import useEstimatedNoteProgress from '@/lib/useEstimatedNoteProgress';

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

function getTier(tokens) {
  if (!tokens || tokens <= 25000) return { label: 'Tier 1', price: 9 };
  if (tokens <= 50000) return { label: 'Tier 2', price: 17 };
  if (tokens <= 75000) return { label: 'Tier 3', price: 29 };
  return { label: 'Tier 4', price: 37 };
}

const styleLabels = { exam: 'Exam Note', standard: 'Standard', textbook: 'Textbook' };

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
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
function ActionBtn({ children, onClick, icon, danger, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-all
        ${active ? 'btn-option-active' : danger ? 'btn-danger' : 'btn-surface'}
        ${danger ? 'text-[#ef4444]' : ''}`}
    >
      {icon}{children}
    </button>
  );
}

// ─── Detail field ──────────────────────────────────────────────────────────────
function DetailField({ label, value, editing, editValue, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{label}</div>
      {editing ? (
        <input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '—'}
          className="bg-[var(--surface-raised)] border border-[rgba(0,212,200,0.25)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--fg)] outline-none focus:border-[rgba(0,212,200,0.5)] transition-colors w-full placeholder:text-[var(--fg-3)] min-h-[32px]"
        />
      ) : (
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--fg)] min-h-[32px] capitalize truncate flex items-center">
          {value || '—'}
        </div>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function NoteViewer({ params }) {
  const router = useRouter();
  const t = useTranslations('notes');
  const locale = useLocale();
  const { getAccessTokenSilently } = useAuth0();
  const { id } = use(params);

  const NOTE_STEPS_KEYS = ['stepReadingTranscript', 'stepGeneratingNote', 'stepSavingNote'];
  const getStyleLabel = (style) => {
    if (style === 'stripped') return t('examNote');
    if (style === 'standard') return t('standard');
    if (style === 'textbook') return t('textbook');
    return style;
  };

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategorization, setEditCategorization] = useState(null);
  const [categoryChanged, setCategoryChanged] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [regenError, setRegenError] = useState(null);

  const [procStatus, setProcStatus] = useState('idle');
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [estimatedInputTokens, setEstimatedInputTokens] = useState(null);
  const intervalRef = useRef(null);
  const progressBarRef = useRef(null);

  const estimatedProgress = useEstimatedNoteProgress({
    active: procStatus === 'processing',
    status: currentStatus,
    inputTokens: estimatedInputTokens,
    style: note?.style,
  });

  const [unlockingTrial, setUnlockingTrial] = useState(false);
  const [unlockTrialError, setUnlockTrialError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  const [colorMode, setColorMode] = useState('dark');
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setColorMode(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Fetch initial note
  useEffect(() => {
    if (!id) return;
    const fetchNote = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`/api/note/getDetail/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? t('errorNoteNotFound'));
          setLoading(false);
          return;
        }
        setNote(data.detail);
        setEditName(data.detail.name ?? '');
        setEditContent(data.detail.content ?? '');
        setEditCategorization(data.detail.categorization ?? null);
        setCategoryChanged(false);
        
        // Seed categories array with current category so it's not empty instantly
        if (data.detail.categorization) {
          setCategories([data.detail.categorization]);
        }
      } catch (err) {
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [id, getAccessTokenSilently]);

  // Fetch all user categories when editing starts
  useEffect(() => {
    if (isEditing) {
      const fetchCats = async () => {
        try {
          const token = await getAccessTokenSilently();
          const res = await fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.categories) setCategories(data.categories);
        } catch (e) {
          console.error("Failed to load categories", e);
        }
      };
      fetchCats();
    }
  }, [isEditing, getAccessTokenSilently]);

  const handleCreateCategory = async (newCatData) => {
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newCatData)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCategories(prev => [...prev, data.category]);
      setEditCategorization(data.category);
      setCategoryChanged(true);
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error("Failed to create category", err);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/unlock', {
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

  const stepMap = { pending: 0, reading: 0, generating: 1, saving: 2 };
  const handleReaderScroll = (e) => {
    const el = e.target;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${Math.min(100, pct)}%`;
    }
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const copyNote = async () => {
    const copied = await copyToClipboard(note?.content ?? '');
    if (!copied) return;
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/edit/content', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent, publicId: id,
          name: editName,
          ...(categoryChanged ? { categorizationId: editCategorization?.id ?? null } : {}),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNote(prev => ({
        ...prev,
        content: editContent,
        name: editName,
        categorization: categoryChanged ? editCategorization : prev.categorization,
      }));
      setCategoryChanged(false);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/delete', {
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
      router.push('/note');
    } catch {
      setDeleteModal(false);
      setDeleteError(t('errorGeneric'));
      setDeleting(false);
    }
  };

  const pollStatus = (token) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/note/status/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const status = data.status?.toLowerCase();
        setCurrentStatus(status);

        if (status === 'completed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
          window.dispatchEvent(new Event('balance:refresh'));
          router.refresh();
          const res2 = await fetch(`/api/note/getDetail/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          const data2 = await res2.json();
          if (!data2.error) {
            setNote(data2.detail);
            setEditName(data2.detail.name ?? '');
            setEditContent(data2.detail.content ?? '');
            setEditCategorization(data2.detail.categorization ?? null);
            setCategoryChanged(false);
          }
        } else if (status === 'failed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleRegenerate = async () => {
    setProcStatus('processing');
    setCurrentStatus('pending');
    setEstimatedInputTokens(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/regenerate/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
      });
      const data = await res.json();
      if (data.error) { 
        setRegenError(data.error);
        setProcStatus('idle'); 
        return; 
      }
      setEstimatedInputTokens(data.estimatedInputTokens ?? null);
      pollStatus(token);
    } catch (err) {
      console.error('Regenerate failed:', err);
      setProcStatus('idle');
    }
  };

  const tier = note ? getTier(note.total_tokens ?? 0) : null;
  const displayedPaidAmount = note?.generation_type === 'group'
    ? (note.viewer_paid_amount ?? 0)
    : note?.charge_amount;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar />

      <CategorizationModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCreate={handleCreateCategory}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mb-2 text-[14px] font-medium text-[var(--fg)]">{t('failedToLoad')}</div>
                <div className="mb-4 text-[12px] text-[var(--fg-3)]">{error}</div>
                <button onClick={() => router.push('/note')}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-[13px] text-[var(--fg-2)] transition-all hover:text-[var(--fg)]">
                  {t('backToNotes')}
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && note && (
            <motion.div
              className="relative flex flex-1 flex-col overflow-hidden min-w-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {procStatus === 'processing' && (
                <GeneratingOverlay
                  variant="document"
                  title={t('regeneratingNote')}
                  subtitle={t(NOTE_STEPS_KEYS[stepMap[currentStatus]]) ?? 'Processing…'}
                  targetProgress={estimatedProgress}
                  smoothed={false}
                  onCancel={null}
                />
              )}

              {/* Page header */}
              <div className="flex-shrink-0 flex items-center justify-between px-7 pt-5 pb-0 gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)] select-none truncate">
                    {isEditing ? editName : note.name}
                  </h1>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[11px] text-[var(--fg-3)] select-none">
                  {t('lastGenerated')} <span className="text-[var(--fg-2)]">{formatCreatedAt(note.created_at, locale)}</span>
                </div>
              </div>

              {/* Workspace */}
              <div className="relative flex flex-1 overflow-hidden gap-3.5 p-5 px-7 min-h-0">
                {!note.is_unlocked && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-md">
                    <div className="flex flex-col items-center p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-[400px]">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(168,85,247,0.1)] mb-4">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-[#a855f7] fill-none stroke-[2]">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                      <h2 className="text-[18px] font-semibold text-[var(--fg)] mb-2">Locked Group Note</h2>
                      <p className="text-[13px] text-[var(--fg-3)] mb-6">
                        This note was generated by your group. You can unlock it for (<LocalCreditPrice credits={note.unlock_price ?? note.charge_amount} />) {note.unlock_price ?? note.charge_amount} credits to view its contents.
                      </p>
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="btn-accent w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium"
                      >
                        {unlocking ? 'Unlocking...' : (
                          <>Unlock for (<LocalCreditPrice credits={note.unlock_price ?? note.charge_amount} />) {note.unlock_price ?? note.charge_amount} <CreditIcon size={13} /></>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* ── Left panel ── */}
                <div
                  className="flex w-[280px] flex-shrink-0 flex-col gap-3 overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                >
                  {/* Source file */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
                    <div className="px-4 py-2.5 border-b border-[var(--border)] text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)] select-none">
                      {t('sourceFile')}
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-[12.5px] font-medium text-[var(--fg)]">
                            {note.uploaded_filename ?? note.transcriptName}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[var(--fg-3)]">
                            {note.uploaded_filename ? t('uploadedFile') : t('inAppTranscript')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
                    <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between select-none">
                      <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('detailsLabel')}</div>
                      {isEditing && <div className="text-[10px] text-[var(--accent)] opacity-70">{t('editing')}</div>}
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <DetailField label={t("noteName")} value={note.name} editing={isEditing} editValue={editName} onChange={setEditName} />
                      <DetailField label={t("language")} value={note.language} editing={false} />
                      <DetailField label={t("noteStyle")} value={getStyleLabel(note.style)} editing={false} />
                      
                      {/* Category Field */}
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">Category</div>
                        {isEditing ? (
                          <CategoryDropdown
                            compact
                            value={editCategorization}
                            categories={categories}
                            onChange={(category) => {
                              setEditCategorization(category);
                              setCategoryChanged(true);
                            }}
                            onCreate={() => setIsCategoryModalOpen(true)}
                          />
                        ) : (
                          <div className="flex min-h-[32px] items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1">
                            {note.categorization
                              ? <span className="truncate text-[12px] text-[var(--fg)]">
                                  {note.categorization.course_name}{note.categorization.period_label ? ` / ${note.categorization.period_label}` : ''}
                                </span>
                              : <span className="text-[12px] text-[var(--fg-3)]">Uncategorized</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Token breakdown */}
                  <div className="rounded-xl border border-[rgba(0,212,200,0.1)] bg-[var(--surface)] overflow-hidden surface-teal">
                    <div className="px-4 py-2.5 border-b border-[var(--border)] text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)] select-none">
                      {t('usageLabel')}
                    </div>
                    <div className="p-3.5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-[var(--fg-3)]">{t('totalTokens')}</span>
                        <span className="font-mono text-[12px] text-[var(--fg)]">{note.total_tokens?.toLocaleString() ?? '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="text-[var(--fg-3)]">{t('tierLabel')}</span>
                        <span className="font-mono text-[12px] text-[var(--fg)]">{tier?.label}</span>
                      </div>
                      <div className="h-px bg-[var(--surface-tint)] my-1" />
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[12.5px] font-medium text-[var(--fg-2)]">
                          {note.generation_type === 'group' ? 'Your paid amount' : t('charged')}
                        </span>
                        {note.is_trial ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-[var(--fg-4)] line-through decoration-1 leading-none">
                              (<LocalCreditPrice credits={displayedPaidAmount} />) {displayedPaidAmount} <CreditIcon size={10} className='opacity-50 inline-block mb-[1px]' />
                            </span>
                            <span className="font-mono text-[14px] font-bold text-[#22c55e] leading-none uppercase tracking-wide">
                              TRIAL
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[var(--fg-4)] font-sans">
                              (<LocalCreditPrice credits={displayedPaidAmount} />)
                            </span>
                            <span className="font-mono text-[16px] font-medium text-[var(--accent)] flex items-center">
                              {displayedPaidAmount} <CreditIcon size={16} className='ml-1' />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Regenerate */}
                  {note.can_manage && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0 mt-1 pb-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={procStatus === 'processing'}
                        className="btn-accent flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none stroke-2">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        {t('regenerateNote')}
                      </button>
                    </div>
                  )}

                </div>

                {/* ── Right panel ── */}
                <div className="flex flex-1 flex-col overflow-hidden min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">

                  {/* Viewer header */}
                  <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[13px] font-medium text-[var(--fg-2)]">{t('generatedNote')}</span>
                      <div className="flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                        <div className="h-[5px] w-[5px] rounded-full bg-current" />
                        {t('completed')}
                      </div>
                    </div>
                    
                    {/* Toolbar area */}
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {note.can_manage && (
                        <ActionBtn
                          onClick={isEditing ? handleSave : () => setIsEditing(true)}
                          active={isEditing || saved}
                          icon={
                            saved ? (
                              <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[2]">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            )
                          }
                        >
                          {saving ? t('saving') : saved ? t('saved') : isEditing ? t('save') : t('edit')}
                        </ActionBtn>
                      )}

                      {isEditing && (
                        <ActionBtn onClick={() => {
                          setIsEditing(false);
                          setEditName(note.name ?? '');
                          setEditContent(note.content ?? '');
                          setEditCategorization(note.categorization ?? null);
                          setCategoryChanged(false);
                        }} icon={
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        }>{t('cancel')}</ActionBtn>
                      )}

                      {!isEditing && (
                        <>
                          <ActionBtn onClick={copyNote} icon={
                            <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          }>{t('copy')}</ActionBtn>

                          <ActionBtn onClick={() => setIsFullscreen(true)} icon={
                            <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                          }>{t('fullscreen')}</ActionBtn>

                          <ActionBtn danger onClick={() => setDeleteModal(true)} icon={
                            <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4h6v2" />
                            </svg>
                          }>
                            {deleting ? t('deleting') : t('delete')}
                          </ActionBtn>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-hidden" data-color-mode={colorMode}>
                    {isEditing ? (
                      <MDEditor
                        value={editContent}
                        onChange={setEditContent}
                        height="100%"
                        preview="edit"
                        style={{ background: 'var(--surface)', borderRadius: 0, border: 'none', height: '100%' }}
                        previewOptions={{ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }}
                      />
                    ) : (
                      <div
                        className="h-full overflow-y-auto px-10 py-8"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                      >
                        {/* Meta chips */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                          {[
                            {
                              label: formatCreatedAt(note.created_at, locale),
                              icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
                            },
                            {
                              label: getStyleLabel(note.style),
                              icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
                            },
                            {
                              label: note.instructor ?? note.name,
                              icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
                            },
                          ].map((m, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                              {m.icon}{m.label}
                            </div>
                          ))}
                        </div>

                        <div className="w-full max-w-none relative pb-20">
                          <MDEditor.Markdown
                            source={note.content}
                            style={{ background: 'transparent', color: 'var(--fg-body)', fontSize: '14px', lineHeight: '2' }}
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ── Fullscreen reader ── */}
      <AnimatePresence>
        {deleteError && <ErrorModal message={deleteError} onClose={() => setDeleteError(null)} />}
        {regenError && <ErrorModal message={regenError} onClose={() => setRegenError(null)} />}
        {deleteModal && (
          <ConfirmModal
            title={t('deleteNote')}
            message={t('deleteNoteConfirm')}
            confirmLabel={t('delete')}
            loadingLabel={t('deleting')}
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => { if (!deleting) setDeleteModal(false); }}
          />
        )}
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col"
          >
            <nav className="h-14 flex-shrink-0 flex items-center justify-between px-8 border-b border-[var(--border-faint)] bg-[var(--surface)] nav-surface">
              <div className="flex items-center gap-4 select-none">
                <span className="font-serif text-[18px] text-[var(--accent)]">Eidolon</span>
                <div className="h-4 w-px bg-[var(--surface-tint)]" />
                <span className="text-[12px] text-[var(--fg-2)] truncate max-w-[400px]">
                  {note.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyNote}
                  className="btn-surface flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all">
                  <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {t('copyAll')}
                </button>
                <button onClick={() => setIsFullscreen(false)}
                  className="btn-icon-danger group flex h-9 w-9 items-center justify-center rounded-lg transition-all">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-2 stroke-[var(--fg-3)] group-hover:stroke-[#ef4444] transition-colors">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </nav>

            <div className="h-[2px] w-full bg-[var(--surface-deep)] flex-shrink-0 overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full bg-[var(--accent)]"
                style={{ width: '0%', transition: 'width 60ms linear', willChange: 'width' }}
              />
            </div>

            <div
              className="flex-1 overflow-y-auto py-16 px-8 flex justify-center"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
              onScroll={handleReaderScroll}
            >
              <div className="w-full max-w-[680px]">
                <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-3)] mb-3 select-none">
                  {note.name}
                  <span className="text-[var(--fg-3)] mx-1">·</span>
                  {formatCreatedAt(note.created_at, locale)}
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mb-8 flex items-center gap-2 select-none">
                  {t('generatedByEidolon')} <span className="text-[var(--fg-3)]">·</span>
                  {note.is_trial ? (
                    <span className="font-mono text-[#22c55e] font-bold">TRIAL</span>
                  ) : (
                    <>(<LocalCreditPrice credits={displayedPaidAmount} />) {displayedPaidAmount}<CreditIcon size={12} color='#9a9aaa' /></>
                  )}
                </div>
                <div data-color-mode={colorMode} className="relative pb-20">
                  <MDEditor.Markdown
                    source={note.content}
                    style={{ background: 'transparent', color: 'var(--fg-body)', fontSize: '15px', lineHeight: '1.95' }}
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-[12.5px] text-[var(--fg-2)] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t('copiedToClipboard')}
      </div>
    </div>
  );
}
