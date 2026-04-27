'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import ErrorModal from '../ErrorModal';
import ConfirmModal from '@/app/ConfirmModal';
import { useTranslations } from 'next-intl';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GROUP_TIERS = [
  { id: 'small',   label: 'Small',   seats: 5,  discount: '15%' },
  { id: 'study',   label: 'Study',   seats: 10, discount: '25%' },
  { id: 'class',   label: 'Class',   seats: 25, discount: '40%' },
  { id: 'faculty', label: 'Faculty', seats: 50, discount: '60%' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function normalizeGroup(g) {
  return {
    name:        g.name,
    invite_code: g.invite_code,
    tier:        g.tier,
    capacity:    g.max_members,
    members:     g.members.map(m => ({
      id:        m.user_id,
      name:      m.username,
      avatar:    m.avatar_url,
      role:      m.role,
      isMe:      m.is_me ?? false,
      joined_at: m.joined_at,
    })),
  };
}

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};


// ─── Edit name modal ───────────────────────────────────────────────────────────
function EditNameModal({ value, onChange, onSave, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] mx-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl overflow-hidden surface"
      >
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="text-[14px] font-medium text-[var(--fg)]">{t('renameGroup')}</div>
          <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{t('renameGroupHint')}</div>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          <input
            autoFocus value={value} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape' && !loading) onClose(); }}
            disabled={loading}
            placeholder={t('groupName')}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[13px] text-[var(--fg)] outline-none focus:border-[rgba(0,212,200,0.35)] transition-colors placeholder:text-[var(--fg-3)] disabled:opacity-50"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} disabled={loading}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-[12.5px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed">
              Cancel
            </button>
            <button onClick={onSave} disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12.5px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading && <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#0c0c0e]" />}
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function GroupSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton h-6 w-48 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1.5">
            <div className="skeleton h-2.5 w-16 rounded-full" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="skeleton h-8 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="skeleton h-2.5 w-16 rounded-full" />
          <div className="skeleton h-2.5 w-24 rounded-full" />
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-[var(--border-faint)] px-5 py-3.5 last:border-0">
              <div className="flex items-center gap-3.5">
                <div className="skeleton h-9 w-9 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-2.5 w-20 rounded" />
                </div>
              </div>
              <div className="skeleton h-2.5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="skeleton h-20 w-full rounded-xl" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Groups() {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations("groups");

  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading]         = useState(true);

  // Create flow
  const [isCreating, setIsCreating]     = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedTier, setSelectedTier] = useState('study');
  const [creating, setCreating]         = useState(false);

  // Join flow
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining]   = useState(false);

  // Active group UI
  const [copied, setCopied]             = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName]     = useState('');
  const [renamingLoading, setRenamingLoading] = useState(false);

  // Confirm modals
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving]           = useState(false);
  const [kickTarget, setKickTarget]     = useState(null); // { id, name }
  const [kicking, setKicking]           = useState(false);

  const [error, setError] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchGroup = async () => {
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/group/me', { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      setActiveGroup(data.group ? normalizeGroup(data.group) : null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroup(); }, [getAccessTokenSilently]);

  useEffect(() => {
    if (!activeGroup) return;
    const interval = setInterval(async () => {
      try {
        const token = await getAccessTokenSilently();
        const res   = await fetch('/api/group/me', { headers: { Authorization: `Bearer ${token}` } });
        const data  = await res.json();
        setActiveGroup(data.group ? normalizeGroup(data.group) : null);
      } catch (e) { console.error(e); }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeGroup, getAccessTokenSilently]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newGroupName.trim() || creating) return;
    setError(null);
    setCreating(true);
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/group/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName.trim(), tier: selectedTier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      await fetchGroup();
      setIsCreating(false);
      setNewGroupName('');
    } catch { setError('Something went wrong.'); }
    finally { setCreating(false); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || joining) return;
    setError(null);
    setJoining(true);
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/group/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      await fetchGroup();
      setJoinCode('');
    } catch { setError('Something went wrong.'); }
    finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (leaving) return;
    setError(null);
    setLeaving(true);
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/group/leave', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setConfirmLeave(false); // close only on success
      setActiveGroup(null);
    } catch { setError('Something went wrong.'); }
    finally { setLeaving(false); }
  };

  const handleKick = async () => {
    const targetUserId = kickTarget?.id;
    if (kicking) return;
    setError(null);
    setKicking(true);
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/group/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setKickTarget(null); // close only on success
      setActiveGroup(prev => ({ ...prev, members: prev.members.filter(m => m.id !== targetUserId) }));
    } catch { setError('Something went wrong.'); }
    finally { setKicking(false); }
  };

  const handleEditName = async () => {
    if (!editedName.trim() || editedName.trim() === activeGroup.name || renamingLoading) return;
    setError(null);
    setRenamingLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/group/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editedName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setActiveGroup(prev => ({ ...prev, name: editedName.trim() }));
      setIsEditingName(false);
    } catch { setError('Something went wrong.'); }
    finally { setRenamingLoading(false); }
  };

  const myRole = activeGroup?.members.find(m => m.isMe)?.role;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">

      <AnimatePresence>
        {error && <ErrorModal message={error} onClose={() => setError(null)} />}
        {confirmLeave && (
          <ConfirmModal
            title={t('leaveGroup')}
            message={t('leaveGroupConfirm')}
            confirmLabel={t('leaveGroup')}
            loadingLabel={t('leaving')}
            loading={leaving}
            onConfirm={handleLeave}
            onCancel={() => { if (!leaving) setConfirmLeave(false); }}
          />
        )}
        {kickTarget && (
          <ConfirmModal
            title={`${t('kick')} ${kickTarget.name}?`}
            message={t('kickConfirm')}
            confirmLabel={t('kickMember')}
            loadingLabel={t('kicking')}
            loading={kicking}
            onConfirm={handleKick}
            onCancel={() => { if (!kicking) setKickTarget(null); }}
          />
        )}
        {isEditingName && (
          <EditNameModal
            value={editedName}
            onChange={setEditedName}
            onSave={handleEditName}
            onClose={() => { if (!renamingLoading) setIsEditingName(false); }}
            loading={renamingLoading}
            t={t}
          />
        )}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">

          {loading && <GroupSkeleton />}

          {/* ── Create flow ── */}
          {!loading && isCreating && (
            <motion.div
              className="flex flex-1 flex-col items-center justify-center p-8 overflow-y-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="w-full max-w-[500px]">
                <button
                  onClick={() => { if (!creating) { setIsCreating(false); setError(null); } }}
                  className="mb-6 flex items-center gap-1.5 text-[12px] text-[var(--fg-3)] transition-colors hover:text-[var(--fg)] disabled:opacity-40"
                  disabled={creating}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Back
                </button>
                <h1 className="font-serif text-[24px] font-normal tracking-[-0.02em] text-[var(--fg)] mb-6">
                  {t('configureGroup')}
                </h1>

                <div className="flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 surface noise">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                      {t('groupNameRequired').split('*')[0]} <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      type="text" autoFocus value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                      disabled={creating}
                      placeholder="e.g. CS Year 3 Study Group"
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[13px] text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.35)] disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('groupSize')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GROUP_TIERS.map((tier) => (
                        <button key={tier.id} onClick={() => { if (!creating) setSelectedTier(tier.id); }}
                          disabled={creating}
                          className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed
                            ${selectedTier === tier.id
                              ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.06)]'
                              : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-hover)]'}`}>
                          <div className={`text-[14px] font-medium transition-colors ${selectedTier === tier.id ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>{tier.label}</div>
                          <div className="text-[11.5px] text-[var(--fg-3)]">Up to {tier.seats} members</div>
                          <div className="mt-0.5 text-[10.5px] text-[#22c55e]">{tier.discount} off per member</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleCreate} disabled={!newGroupName.trim() || creating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[13px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed">
                    {creating
                      ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border border-transparent border-t-[#0c0c0e]" />{t('creating')}</>
                      : <>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                          </svg>
                          {t('createGroupButton')}
                        </>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Unjoined ── */}
          {!loading && !isCreating && !activeGroup && (
            <motion.div
              className="flex flex-1 flex-col items-center justify-center p-8 overflow-y-auto"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants} className="mb-10 text-center">
                <h1 className="font-serif text-[26px] font-normal tracking-[-0.02em] text-[var(--fg)] mb-2">
                  {t("studyTogether")}
                </h1>
                <p className="text-[13px] text-[var(--fg-3)] max-w-sm mx-auto leading-relaxed">
                  {t('studyTogetherSubtitle')}
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4 w-full max-w-[760px]">

                {/* Create */}
                <button
                  onClick={() => { setIsCreating(true); setError(null); }}
                  className="group flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-left transition-all hover:border-[rgba(0,212,200,0.3)] hover:bg-[var(--card-hover)] surface noise"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(0,212,200,0.07)] border border-[rgba(0,212,200,0.2)]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[var(--accent)] fill-none stroke-2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <h3 className="text-[15px] font-medium text-[var(--fg)] mb-2 group-hover:text-[var(--accent)] transition-colors">{t("createGroup")}</h3>
                  <p className="text-[12.5px] leading-relaxed text-[var(--fg-3)] mb-6">
                    {t('createGroupDesc')}
                  </p>
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)]">
                    {t('getStarted')}
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                </button>

                {/* Join */}
                <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col justify-between surface noise">
                  <div>
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[var(--fg-2)] fill-none stroke-2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                    </div>
                    <h3 className="text-[15px] font-medium text-[var(--fg)] mb-2">{t("joinExisting")}</h3>
                    <p className="text-[12.5px] leading-relaxed text-[var(--fg-3)] mb-5">
                      {t('joinExistingDesc')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                      disabled={joining}
                      placeholder={t('inviteCodePlaceholder')}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 font-mono text-[13px] text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.35)] disabled:opacity-50"
                    />
                    <button onClick={handleJoin} disabled={!joinCode.trim() || joining}
                      className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
                      {joining
                        ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border border-transparent border-t-[#0c0c0e]" />{t('joining')}</>
                        : t('join')
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Active group ── */}
          {!loading && !isCreating && activeGroup && (
            <motion.div
              className="flex-1 overflow-y-auto px-8 py-7 flex flex-col gap-5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Header */}
              <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    {activeGroup.tier} tier
                  </div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-[24px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                      {activeGroup.name}
                    </h1>
                    {myRole === 'owner' && (
                      <button
                        onClick={() => { setEditedName(activeGroup.name); setIsEditingName(true); }}
                        className="text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors mt-0.5"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)] select-none">{t('inviteCode')}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(activeGroup.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="flex items-center gap-1.5 font-mono text-[13px] text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
                    >
                      {activeGroup.invite_code}
                      {copied
                        ? <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--accent)] fill-none stroke-2"><polyline points="20 6 9 17 4 12" /></svg>
                        : <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      }
                    </button>
                  </div>

                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="flex items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.05)] px-4 py-2 text-[12.5px] text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.1)]"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    {t('leaveGroup')}
                  </button>
                </div>
              </motion.div>

              {/* Member list */}
              <motion.div variants={itemVariants} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--fg-3)] select-none">{t('members')}</div>
                  <div className="text-[11px] text-[var(--fg-3)]">{activeGroup.members.length} / {activeGroup.capacity} {t('slots')}</div>
                </div>

                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
                  {activeGroup.members.map((member) => (
                    <div key={member.id}
                      className="flex items-center justify-between border-b border-[var(--border-faint)] px-5 py-3.5 last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border overflow-hidden ${member.isMe ? 'border-[rgba(0,212,200,0.2)]' : 'border-[var(--border)]'}`}>
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className={`flex h-full w-full items-center justify-center font-serif text-[15px] ${member.isMe ? 'bg-[rgba(0,212,200,0.1)] text-[var(--accent)]' : 'bg-[var(--surface-raised)] text-[var(--fg)]'}`}>
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13.5px] font-medium ${member.isMe ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                              {member.name}{member.isMe ? ' (You)' : ''}
                            </span>
                            {member.role === 'owner' && (
                              <span className="rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] px-1.5 py-px text-[9px] uppercase tracking-[0.06em] text-[#f59e0b]">
                                {t('owner')}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--fg-3)] mt-0.5">{t('joinedOn')} {formatDate(member.joined_at)}</span>
                        </div>
                      </div>

                      {myRole === 'owner' && !member.isMe && (
                        <button
                          onClick={() => setKickTarget({ id: member.id, name: member.name })}
                          className="text-[11px] text-[var(--fg-3)] hover:text-[#ef4444] transition-colors uppercase tracking-[0.05em]"
                        >
                          {t('kick')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Billing info */}
              <motion.div
                variants={itemVariants}
                className="flex items-start gap-3 rounded-xl border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.03)] px-5 py-4 surface-teal"
              >
                <svg viewBox="0 0 24 24" className="mt-px h-4 w-4 flex-shrink-0 stroke-[var(--accent)] fill-none stroke-[1.8]">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <div className="text-[13px] font-medium text-[var(--fg)] mb-1">{t("billingActive")}</div>
                  <p className="text-[12.5px] leading-relaxed text-[var(--fg-3)]">
                    {t('billingDesc')}
                  </p>
                </div>
              </motion.div>

            </motion.div>
          )}

        </main>
      </div>
    </div>
  );
}