'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import CreditIcon from '../CreditIcon';
import { useTranslations } from 'next-intl';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PERIODS = ['1W', '1M', '6M', '1Y'];

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Delete modal ──────────────────────────────────────────────────────────────
function DeleteModal({ balance, onConfirm, onClose, loading, t }) {
  const [confirmText, setConfirmText] = useState('');
  const ready = confirmText.toLowerCase() === 'delete my account';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] mx-4 overflow-hidden rounded-2xl border border-[rgba(239,68,68,0.18)] bg-[var(--surface)] surface"
      >
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl"
          style={{ background: 'rgba(239,68,68,0.08)' }} />

        <div className="relative px-6 py-5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="font-serif text-[18px] font-normal tracking-[-0.02em] text-[var(--fg)]">{t('deleteAccountModal')}</div>
          <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{t('deleteAccountModalSubtitle')}</div>
        </div>

        <div className="relative px-6 py-5 flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-[var(--fg-3)]">
            {t('deleteAccountDesc')}
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--fg-3)]">
              {t('deleteAccountConfirmText').split(t('deleteAccountConfirmPrompt'))[0]}
              <span className="text-[var(--fg)]">{t('deleteAccountConfirmPrompt')}</span>
              {t('deleteAccountConfirmText').split(t('deleteAccountConfirmPrompt'))[1]}
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
              placeholder={t('deleteAccountConfirmPrompt')}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-[13px] text-[var(--fg)] outline-none transition-colors focus:border-[rgba(239,68,68,0.4)] placeholder:text-[var(--fg-3)] placeholder:opacity-40 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="relative flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} disabled={loading}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-[12.5px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!ready || loading}
            className="flex items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] px-4 py-2 text-[12.5px] text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-35 disabled:cursor-not-allowed">
            {loading && <div className="h-3.5 w-3.5 animate-spin rounded-full border border-transparent border-t-[#ef4444]" />}
            {loading ? t('deleting') : t('deleteAccount')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Profile() {
  const { getAccessTokenSilently } = useAuth0();
  const t = useTranslations("profile");

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6M');
  const [statsLoading, setStatsLoading] = useState(false);

  // Name edit
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState(null);

  // Delete
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Initial load — profile + stats + history ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAccessTokenSilently();
        const headers = { Authorization: `Bearer ${token}` };
        const [pRes, sRes, hRes] = await Promise.all([
          fetch('/api/profile/me', { headers }),
          fetch(`/api/profile/stats?period=${period}`, { headers }),
          fetch('/api/profile/history', { headers }),
        ]);
        const [p, s, h] = await Promise.all([pRes.json(), sRes.json(), hRes.json()]);
        setProfile(p.profile);
        setStats(s.stats);
        setHistory(h.history ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getAccessTokenSilently]);

  // ── Period change — only re-fetch stats ─────────────────────────────────────
  useEffect(() => {
    if (loading) return; // skip on initial load (already fetched above)
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`/api/profile/stats?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const s = await res.json();
        setStats(s.stats);
      } catch (e) {
        console.error(e);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [period]);

  // ── Save name ───────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === profile.username || nameSaving) return;
    setNameError(null);
    setNameSaving(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: editedName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setNameError(data.error); return; }
      setProfile(prev => ({ ...prev, username: editedName.trim() }));
      setEditingName(false);
    } catch { setNameError('Something went wrong.'); }
    finally { setNameSaving(false); }
  };

  // ── Delete account ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const token = await getAccessTokenSilently();
      await fetch('/api/profile/delete', {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex flex-1 flex-col overflow-y-auto p-7 gap-5">
            <div className="skeleton h-6 w-32 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-56 rounded-xl" />
              <div className="skeleton h-56 rounded-xl" />
            </div>
            <div className="skeleton h-56 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
          </main>
        </div>
      </div>
    );
  }

  const balanceFormatted = parseFloat(profile?.balance ?? 0).toFixed(2);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">

      <AnimatePresence>
        {deleteModal && (
          <DeleteModal
            balance={balanceFormatted}
            onConfirm={handleDelete}
            onClose={() => { if (!deleteLoading) setDeleteModal(false); }}
            loading={deleteLoading}
            t={t}
          />
        )}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <motion.main
          className="flex flex-1 flex-col overflow-y-auto gap-5 p-7"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)] flex-shrink-0">
            {t("title")}
          </motion.div>

          {/* Top row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 flex-shrink-0">

            {/* Account card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
              <div className="px-5 py-3.5 border-b border-[var(--border)]">
                <span className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('account')}</span>
              </div>
              <div className="p-5">
                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 flex-shrink-0 rounded-full border border-[rgba(0,212,200,0.2)] overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(0,212,200,0.3)] to-[rgba(0,212,200,0.08)] font-serif text-[22px] text-[var(--accent)]">
                        {profile?.username?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          autoFocus value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape' && !nameSaving) setEditingName(false); }}
                          disabled={nameSaving}
                          className="rounded-lg border border-[rgba(0,212,200,0.35)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[14px] font-medium text-[var(--fg)] outline-none w-[180px] disabled:opacity-50"
                        />
                        <button onClick={handleSaveName} disabled={nameSaving}
                          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50">
                          {nameSaving && <div className="h-2.5 w-2.5 animate-spin rounded-full border border-transparent border-t-[#0c0c0e]" />}
                          {nameSaving ? 'Saving…' : 'Save'}
                        </button>
                        {!nameSaving && (
                          <button onClick={() => { setEditingName(false); setNameError(null); }}
                            className="text-[11px] text-[var(--fg-3)] hover:text-[var(--fg)] transition-colors">
                            Cancel
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[15px] font-medium text-[var(--fg)] truncate">{profile?.username}</span>
                        <button
                          onClick={() => { setEditedName(profile.username); setEditingName(true); setNameError(null); }}
                          className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[rgba(0,212,200,0.3)] hover:text-[var(--accent)] transition-all"
                        >
                          <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-[var(--fg-3)] fill-none stroke-2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {nameError && <p className="text-[11px] text-[#ef4444] mb-1">{nameError}</p>}
                    <div className="text-[12.5px] text-[var(--fg-3)] truncate">{profile?.email}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] text-[#22c55e]">
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 stroke-current fill-none stroke-[2.5]"><polyline points="20 6 9 17 4 12" /></svg>
                      {t('googleAccount')}
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-lg border border-[rgba(0,212,200,0.12)] bg-[rgba(0,212,200,0.04)] px-3 py-2.5">
                    <span className="text-[12px] text-[var(--fg-3)]">{t("currentBalance")}</span>
                    <span className="font-mono text-[13px] font-medium text-[var(--accent)]">{balanceFormatted} <CreditIcon size={14}/></span>
                  </div>
                  {[
                    { label: t('memberSince'), value: new Date(profile?.created_at).toLocaleDateString((t('type') === 'Tipo' ? 'es-ES' : (t('type') === '类型' ? 'zh-CN' : 'en-GB')), { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { label: t('accountId'), value: profile?.id },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                      <span className="text-[12px] text-[var(--fg-3)]">{label}</span>
                      <span className="font-mono text-[12px] text-[var(--fg)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Usage stats card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                <span className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('usage')}</span>
                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                  {PERIODS.map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`rounded px-2.5 py-1 text-[11px] transition-all ${period === p ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`p-5 grid grid-cols-2 gap-2.5 transition-opacity duration-200 ${statsLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {[
                  { label: t('notesGenerated'), value: stats?.notes ?? '—', sub: `${t('across')} ${stats?.courses ?? 0} ${t('courses')}` },
                  { label: t('transcriptions'), value: stats?.transcriptions ?? '—', sub: `~${stats?.audio_hours ?? 0} ${t('audioHours')}` },
                  { label: t('tokensProcessed'), value: stats?.tokens ?? '—', sub: t('inputOutput'), small: true },
                  { label: t('totalSpent'), value: `${stats?.total_spent?.toFixed(0) ?? '—'}`, sub: `${t('since')} ${new Date(profile?.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`, cyan: true, small: true },
                ].map(({ label, value, sub, cyan, small }) => (
                  <div key={label} className={`rounded-lg border px-4 py-3.5 ${cyan ? 'border-[rgba(0,212,200,0.12)] bg-[rgba(0,212,200,0.04)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}>
                    <div className="mb-1.5 text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{label}</div>
                    <div className={`flex items-center font-mono font-medium ${small ? 'text-[16px]' : 'text-[20px]'} ${cyan ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>{value}{label=== 'Total spent' ? <CreditIcon size={14} className='ml-1'/> : ""}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--fg-3)]">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Balance history */}
          <motion.div variants={itemVariants} className="flex-shrink-0">
            <div className="mb-2.5 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-3)] select-none">{t("balanceHistory")}</div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface">
              <div style={{ maxHeight: 280, overflowY: 'auto', overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {[t('type'), t('description'), t('amount'), t('balanceAfterTx'), t('date'), t('refId')].map((h, idx) => (
                        <th key={idx} className="pl-3.5 py-2.5 text-left text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)] font-normal border-b border-[var(--border)] bg-[var(--surface)] sticky top-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3.5 py-8 text-center text-[12px] text-[var(--fg-3)]">{t('noTransactions')}</td>
                      </tr>
                    ) : history.map((tx, i) => (
                      <tr key={i} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--fg-2)]">
                            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${tx.type === 'topup' || tx.type === 'rebate' ? 'bg-[#22c55e]' : 'bg-[var(--fg-4)]'}`} />
                            {tx.type === 'topup' ? t('topUp') : tx.type === 'rebate' ? t('rebate') : t('spend')}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-[12.5px] text-[var(--fg-2)]">{tx.description}</td>
                        <td className="px-3.5 py-3">
                          <span className={`font-mono flex items-center text-[13px] font-medium ${tx.type === 'topup' || tx.type === 'rebate' ? 'text-[#22c55e]' : 'text-[var(--fg-2)]'}`}>
                            {tx.type === 'rebate' || tx.type === 'topup' ? '+' : '-'} {Math.abs(tx.charge_amount).toFixed(2)} <CreditIcon size={12} className='ml-2' color={tx.type === 'topup' || tx.type === 'rebate'? '#22c55e' : 'var(--fg-3)'}/>
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[12px] text-[var(--fg-2)]">{parseFloat(tx.balance_after)?.toFixed(2)} <CreditIcon size={12} color='#b4b4c2'/></td>
                        <td className="px-3.5 py-3 text-[12.5px] text-[var(--fg-2)]">
                          {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-[var(--fg-3)] truncate">{tx.ref ? `${tx.ref.slice(0, 16)}…` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Danger zone */}
          <motion.div variants={itemVariants} className="flex-shrink-0">
            <div className="mb-2.5 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-3)] select-none">{t("dangerZone")}</div>
            <div className="rounded-xl border border-[rgba(239,68,68,0.15)] bg-[var(--surface)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[rgba(239,68,68,0.1)]">
                <span className="text-[10.5px] uppercase tracking-[0.07em] text-[#ef4444]">{t('irreversibleActions')}</span>
              </div>
              <div className="flex items-center justify-between gap-6 p-5">
                <div>
                  <div className="text-[14px] font-medium text-[var(--fg)] mb-1">{t("deleteAccount")}</div>
                  <p className="text-[12.5px] leading-relaxed text-[var(--fg-3)] max-w-lg">
                    {t('deleteAccountDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteModal(true)}
                  className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-5 py-2.5 text-[13px] text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.14)] hover:border-[rgba(239,68,68,0.5)]"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4h6v2" />
                  </svg>
                  {t('deleteAccount')}
                </button>
              </div>
            </div>
          </motion.div>

        </motion.main>
      </div>
    </div>
  );
}