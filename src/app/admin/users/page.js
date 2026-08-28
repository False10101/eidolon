'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import CreditIcon from '@/app/CreditIcon';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

function Sk({ w = 'w-16', h = 'h-3' }) { return <div className={`skeleton rounded ${h} ${w}`} />; }
function fmtCredit(n) { return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function fmtFiat(n) { return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function timeAgo(ts) {
  if (!ts) return '—';
  const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  const diff = Date.now() - new Date(str).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TYPE_DOT = { note: 'bg-[var(--accent)]', transcript: 'bg-[#22c55e]', exam_prep: 'bg-[#f59e0b]', audio_convert: 'bg-[#a78bfa]', topup: 'bg-[#a78bfa]', rebate: 'bg-[#3b82f6]' };
const TYPE_LABEL = { note: 'Note', transcript: 'Transcript', exam_prep: 'Exam prep', audio_convert: 'Converter', topup: 'Top-up', rebate: 'Rebate' };

function StatusPill({ status }) {
  const map = { completed: 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]', pending: 'border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b]', failed: 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]' };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] capitalize ${map[status?.toLowerCase()] ?? 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>{status}</span>;
}

function ProfitCell({ profit }) {
  const isPositive = profit > 0;
  const isNegative = profit < 0;
  const color = isPositive ? 'text-[#22c55e]' : isNegative ? 'text-[#ef4444]' : 'text-[var(--fg-4)]';
  const sign = isPositive ? '+' : isNegative ? '-' : '';
  return <span className={`font-mono text-[12px] ${color}`}>{sign}${fmtFiat(Math.abs(profit))}</span>;
}

const NAV = [
  { id: '/admin',          label: 'Overview',  icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { id: '/admin/users',    label: 'Users',     icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { id: '/admin/activity', label: 'Activity',  icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: '/admin/generations', label: 'Generations', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5M8 17h7" /></svg> },
  { id: '/admin/groups',   label: 'Groups',    icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> },
  { id: '/admin/referrals',label: 'Referrals', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
];

export default function UsersAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccessTokenSilently, logout } = useAuth0();
  
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [users, setUsers] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  // Edit Balance State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  const apiFetch = useCallback(async (url, opts = {}) => {
    const token = await getAccessTokenSilently();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers } });
  }, [getAccessTokenSilently]);

  // Fetch List
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&filter=${userFilter}`);
      const data = await res.json();
      setUsers(data?.users ?? []);
    } finally { setLoading(false); }
  }, [apiFetch, userSearch, userFilter]);

  // Fetch Individual Detail
  const loadUserDetail = useCallback(async (id) => {
    setLoadingDetail(true);
    setIsEditingBalance(false);
    try {
      const res = await apiFetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data);
      } else {
        setUserDetail(null);
      }
    } finally { setLoadingDetail(false); }
  }, [apiFetch]);

  // Handle Save Balance
  const handleSaveBalance = async () => {
    if (newBalance === '' || isNaN(newBalance)) return;
    const delta = parseFloat(newBalance) - parseFloat(userDetail.user.balance);
    if (delta === 0) return;
    if (delta < 0 && !window.confirm(`Deduct ${Math.abs(delta)} credits from this user?`)) return;
    const reason = window.prompt('Reason for this balance adjustment:');
    if (!reason?.trim()) return;
    setIsSavingBalance(true);
    try {
      const res = await apiFetch(`/api/admin/users/adjust-balance`, { // <-- Using the endpoint from your previous code
        method: 'POST',
        body: JSON.stringify({ id: selectedUserId, delta, reason: reason.trim() })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update local detail state to reflect new balance instantly
        setUserDetail(prev => ({
          ...prev,
          user: { ...prev.user, balance: data.balance }
        }));
        // Reload list in background so table is fresh when we go back
        loadUsers(); 
        setIsEditingBalance(false);
      } else {
        alert("Failed to update balance.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving.");
    } finally {
      setIsSavingBalance(false);
    }
  };

  useEffect(() => { 
    if (!selectedUserId) loadUsers(); 
  }, [selectedUserId, loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserDetail(selectedUserId);
    } else {
      setUserDetail(null);
    }
  }, [selectedUserId, loadUserDetail]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">
      {/* ══ NAVBAR ══ */}
      <nav className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border-faint)] bg-[var(--surface)] px-8 z-50 nav-surface">
        <div className="flex items-center gap-4 select-none">
          <span className="font-serif text-[20px] tracking-[-0.02em] text-[var(--accent)]">Eidolon<sup className="text-[11px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup></span>
          <div className="h-4 w-px bg-[var(--surface-tint)]" />
          <span className="rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#f59e0b]">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/home')} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-1.5 text-[12.5px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg> Back to app
          </button>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-all hover:border-[rgba(239,68,68,0.3)]">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[var(--fg-4)] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#ef4444]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* ══ SIDEBAR ══ */}
        <aside className="flex w-[200px] flex-shrink-0 flex-col border-r border-[var(--border-faint)] bg-[var(--surface)]">
          <div className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-4)] opacity-40 select-none">Admin</div>
          {NAV.map(n => {
            const isActive = pathname === n.id || (n.id !== '/admin' && pathname?.startsWith(n.id));
            return (
              <Link key={n.id} href={n.id} className={`flex items-center gap-2.5 border-l-2 px-4 py-2 text-[13px] transition-all ${isActive ? 'border-[var(--accent)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]' : 'border-transparent text-[var(--fg-4)] hover:bg-[var(--surface-tint-faint)] hover:text-[var(--fg-3)]'}`}>
                {n.icon} <span className="flex-1 text-left">{n.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* ══ MAIN CONTENT ══ */}
        <main className="flex flex-1 min-w-0 flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!selectedUserId ? (
              // -- LIST VIEW --
              <motion.div key="users-list" className="absolute inset-0 flex flex-col overflow-hidden px-7 py-5 gap-4" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                  <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">Platform <span className="text-[var(--accent)]">users</span></h1>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[var(--fg-4)] fill-none stroke-2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name or email…" className="w-[280px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3.5 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-4)] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                    </div>
                    <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                      {['all', 'active', 'inactive'].map(f => (
                        <button key={f} onClick={() => setUserFilter(f)} className={`rounded px-3 py-1 text-[11px] capitalize transition-all ${userFilter === f ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['User', 'Balance', 'Total spent', 'Gens', 'Referred by', 'Last active', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading && Array(6).fill(null).map((_, i) => (
                          <tr key={i} className="border-b border-[var(--border-faint)]">
                            {[32, 16, 16, 10, 20, 16, 14].map((w, j) => <td key={j} className="px-4 py-3.5"><Sk w={`w-${w}`} /></td>)}
                          </tr>
                        ))}
                        {!loading && (users ?? []).length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[var(--fg-4)] opacity-40">No users found</td></tr>
                        )}
                        {(users ?? []).map(u => (
                          <tr key={u.id} onClick={() => setSelectedUserId(u.id)} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors cursor-pointer">
                            <td className="px-4 py-3.5">
                              <div className="text-[13px] font-medium text-[var(--fg)]">{u.username}</div>
                              <div className="text-[11px] text-[var(--fg-4)]">{u.email}</div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[13px] text-[var(--accent)]"><span className="inline-flex items-center gap-1.5">{fmtCredit(u.balance)} <CreditIcon size={12} color="#00d4c8" /></span></td>
                            <td className="px-4 py-3.5 font-mono text-[12.5px] text-[var(--fg-3)]"><span className="inline-flex items-center gap-1.5">{fmtCredit(u.totalSpent)} <CreditIcon size={11} color="#9898a8" /></span></td>
                            <td className="px-4 py-3.5 text-[12.5px] text-[var(--fg-3)]">{u.generations}</td>
                            <td className="px-4 py-3.5 text-[12px]">
                              {u.referrerUsername ? <span className="rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-2 py-0.5 text-[11px] text-[#f59e0b]">{u.referrerUsername}</span> : <span className="text-[var(--fg-4)] opacity-40">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-[12.5px] text-[var(--fg-3)]">{timeAgo(u.lastLogin)}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${u.isActive ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>
                                <div className="h-[5px] w-[5px] rounded-full bg-current" />{u.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </motion.div>

            ) : (

              // -- DETAIL VIEW --
              <motion.div key="user-detail" className="absolute inset-0 flex flex-col overflow-hidden px-7 py-5 gap-4" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                {loadingDetail || !userDetail ? (
                  <div className="flex h-full items-center justify-center text-[var(--fg-4)] text-[13px]">Loading user data...</div>
                ) : (
                  <>
                    <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedUserId(null)} className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-all hover:bg-[var(--surface-tint)]">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--fg-3)] fill-none stroke-[2] transition-colors group-hover:stroke-[var(--fg)]"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <div>
                          <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">{userDetail.user.username}</h1>
                          <div className="text-[12.5px] text-[var(--fg-4)]">{userDetail.user.email} • Joined {timeAgo(userDetail.user.createdAt)}</div>
                        </div>
                      </div>
                      {userDetail.user.referrerUsername && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-70 mb-0.5">Referred By</span>
                          <span className="rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-2.5 py-0.5 text-[11px] text-[#f59e0b]">{userDetail.user.referrerUsername}</span>
                        </div>
                      )}
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4 flex-shrink-0">
                      {/* --- BALANCE EDIT CARD --- */}
                      <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-70">Balance</span>
                          {!isEditingBalance && (
                            <button 
                              onClick={() => { setIsEditingBalance(true); setNewBalance(userDetail.user.balance.toString()); }} 
                              className="text-[var(--fg-4)] hover:text-[var(--accent)] transition-colors"
                              title="Edit balance"
                            >
                              <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[2]"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                          )}
                        </div>
                        
                        {isEditingBalance ? (
                          <div className="flex flex-col gap-2 mt-0.5">
                            <input 
                              type="number" 
                              value={newBalance} 
                              onChange={(e) => setNewBalance(e.target.value)}
                              disabled={isSavingBalance}
                              placeholder="New balance..."
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[13px] font-mono text-[var(--accent)] outline-none focus:border-[rgba(0,212,200,0.35)] transition-colors disabled:opacity-50"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={handleSaveBalance} 
                                disabled={isSavingBalance} 
                                className="flex-1 rounded-md bg-[rgba(0,212,200,0.1)] py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[rgba(0,212,200,0.15)] transition-colors disabled:opacity-50"
                              >
                                {isSavingBalance ? 'Saving...' : 'Save'}
                              </button>
                              <button 
                                onClick={() => setIsEditingBalance(false)} 
                                disabled={isSavingBalance} 
                                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] py-1.5 text-[11px] text-[var(--fg-3)] hover:text-[var(--fg)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-mono text-[20px] text-[var(--accent)] flex items-center gap-2">
                            {fmtCredit(userDetail.user.balance)} <CreditIcon size={16} color="#00d4c8" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-70 mb-2">Total Profit</span>
                        <div className="font-mono text-[20px]"><ProfitCell profit={userDetail.profit.total} /></div>
                      </div>
                      <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-70 mb-2">Total Revenue</span>
                        <div className="font-mono text-[20px] text-[var(--fg)]">${fmtFiat(userDetail.profit.revenue)}</div>
                      </div>
                      <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-70 mb-2">Total Cost (API)</span>
                        <div className="font-mono text-[20px] text-[var(--fg-3)]">${fmtFiat(userDetail.profit.cost)}</div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 flex-shrink-0">
                      {Object.entries(userDetail.profit.breakdown).map(([key, data]) => (
                        <div key={key} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] capitalize opacity-70">{key}</span>
                            <span className="text-[12px] text-[var(--fg-3)] bg-[var(--surface-deep)] px-2 py-0.5 rounded-md">{data.count} uses</span>
                          </div>
                          <div className="flex justify-between items-end mt-1">
                            <div>
                              <div className="text-[10px] text-[var(--fg-4)] mb-0.5">Profit</div>
                              <ProfitCell profit={data.profit} />
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-[var(--fg-4)] mb-0.5">Rev / Cost</div>
                              <div className="font-mono text-[11px] text-[var(--fg-3)]">${fmtFiat(data.revenue)} / ${fmtFiat(data.cost)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface mt-2">
                      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-between">
                        <h3 className="text-[12.5px] font-medium text-[var(--fg)]">Activity Log (Latest 500)</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              {['Type', 'Title', 'Charge', 'Bal After', 'Status', 'Date'].map(h => (
                                <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(userDetail.activity ?? []).length === 0 && (
                              <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[var(--fg-4)] opacity-40">No activity yet</td></tr>
                            )}
                            {(userDetail.activity ?? []).map(a => (
                              <tr key={a.id} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[var(--fg-4)]'}`} />
                                    <span className="text-[12px] text-[var(--fg-3)]">{TYPE_LABEL[a.type] ?? a.type}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-[var(--fg)] truncate max-w-[200px]" title={a.title}>{a.title}</td>
                                <td className="px-4 py-2.5 font-mono text-[12.5px] text-red-500">{a.chargeAmount > 0 ? '-' : ''}{fmtCredit(a.chargeAmount)}</td>
                                <td className="px-4 py-2.5 font-mono text-[12.5px] text-[var(--fg-3)]">{fmtCredit(a.balanceAfter)}</td>
                                <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                                <td className="px-4 py-2.5 text-[12px] text-[var(--fg-4)] whitespace-nowrap">{timeAgo(a.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
