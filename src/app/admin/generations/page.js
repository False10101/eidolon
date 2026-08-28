'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import CreditIcon from '@/app/CreditIcon';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

const generationIcon = <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5M8 17h7" /></svg>;

const NAV = [
  { id: '/admin', label: 'Overview', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { id: '/admin/users', label: 'Users', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { id: '/admin/activity', label: 'Activity', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: '/admin/generations', label: 'Generations', icon: generationIcon },
  { id: '/admin/groups', label: 'Groups', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></svg> },
  { id: '/admin/referrals', label: 'Referrals', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
];

function fmtCredit(value) {
  return Number(value ?? 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const minutes = Math.round(Number(seconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function Skeleton({ width = 'w-20' }) {
  return <div className={`skeleton h-3 rounded ${width}`} />;
}

function CreditAmount({ value, muted = false }) {
  return (
    <span className={`inline-flex items-center gap-1 ${muted ? 'text-[var(--fg-4)]' : 'text-[var(--fg)]'}`}>
      <CreditIcon className="h-3.5 w-3.5" />
      {fmtCredit(value)}
    </span>
  );
}

function perPersonLabel(item) {
  const min = item.paid.perPersonMin;
  const max = item.paid.perPersonMax;
  if (min == null || max == null) return null;
  return Math.abs(min - max) < 0.001 ? fmtCredit(min) : `${fmtCredit(min)}–${fmtCredit(max)}`;
}

export default function GenerationsAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccessTokenSilently, logout } = useAuth0();
  const [generations, setGenerations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState('all');
  const [mode, setMode] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [truncated, setTruncated] = useState(false);

  const apiFetch = useCallback(async (url) => {
    const token = await getAccessTokenSilently();
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }, [getAccessTokenSilently]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function loadGenerations() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ type, mode });
        if (debouncedSearch) params.set('search', debouncedSearch);
        const response = await apiFetch(`/api/admin/generations?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load generations');
        if (!cancelled) {
          setGenerations(data.generations ?? []);
          setSummary(data.summary ?? null);
          setTruncated(Boolean(data.truncated));
          setExpanded(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setGenerations([]);
          setSummary(null);
          setError(loadError.message || 'Could not load generations');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGenerations();
    return () => { cancelled = true; };
  }, [apiFetch, debouncedSearch, mode, type]);

  const cards = [
    { label: 'Results shown', value: summary?.shown ?? 0 },
    { label: 'Group resources', value: summary?.group ?? 0 },
    { label: 'Access records', value: summary?.unlocks ?? 0 },
    { label: 'Credits collected', value: summary?.collected ?? 0, credit: true },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">
      <nav className="nav-surface z-50 flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border-faint)] bg-[var(--surface)] px-8">
        <div className="flex select-none items-center gap-4">
          <span className="font-serif text-[20px] tracking-[-0.02em] text-[var(--accent)]">Eidolon<sup className="ml-0.5 text-[11px] font-sans font-medium tracking-normal opacity-75">v2</sup></span>
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
        <aside className="flex w-[200px] flex-shrink-0 flex-col border-r border-[var(--border-faint)] bg-[var(--surface)]">
          <div className="px-4 pb-2 pt-5 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-4)] opacity-40 select-none">Admin</div>
          {NAV.map(item => {
            const isActive = pathname === item.id || (item.id !== '/admin' && pathname?.startsWith(item.id));
            return (
              <Link key={item.id} href={item.id} className={`flex items-center gap-2.5 border-l-2 px-4 py-2 text-[13px] transition-all ${isActive ? 'border-[var(--accent)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]' : 'border-transparent text-[var(--fg-4)] hover:bg-[var(--surface-tint-faint)] hover:text-[var(--fg-3)]'}`}>
                {item.icon}<span className="flex-1 text-left">{item.label}</span>
              </Link>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <motion.div className="flex flex-1 flex-col gap-4 overflow-hidden px-7 py-5" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="flex flex-shrink-0 items-start justify-between gap-5">
              <div>
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">Generation <span className="text-[var(--accent)]">analytics</span></h1>
                <p className="mt-1 text-[12px] text-[var(--fg-4)]">Metadata and access receipts only. Generated content is never loaded.</p>
              </div>
              <div className="relative">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[var(--fg-4)] fill-none stroke-2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Title, generator, group..." className="w-[290px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3.5 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-4)] focus:border-[rgba(0,212,200,0.35)]" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-4 gap-3">
              {cards.map(card => (
                <div key={card.label} className="surface rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-55">{card.label}</div>
                  <div className="mt-1.5 text-[20px] font-medium text-[var(--fg)]">
                    {loading ? <Skeleton width="w-16" /> : card.credit ? <CreditAmount value={card.value} /> : Number(card.value).toLocaleString()}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-shrink-0 items-center justify-between">
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                {[['all', 'All'], ['note', 'Notes'], ['transcript', 'Transcripts']].map(([value, label]) => (
                  <button key={value} onClick={() => setType(value)} className={`rounded px-3.5 py-1.5 text-[11px] transition-all ${type === value ? 'bg-[var(--surface-deep)] text-[var(--fg)] shadow-sm' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>{label}</button>
                ))}
              </div>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                {[['all', 'All modes'], ['group', 'Group'], ['individual', 'Individual']].map(([value, label]) => (
                  <button key={value} onClick={() => setMode(value)} className={`rounded px-3 py-1 text-[11px] transition-all ${mode === value ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>{label}</button>
                ))}
              </div>
            </motion.div>

            {error && <motion.div variants={itemVariants} className="rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-[12px] text-[#ef4444]">{error}</motion.div>}

            <motion.div variants={itemVariants} className="surface flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                <table className="w-full min-w-[1120px] border-collapse">
                  <thead>
                    <tr>
                      {['Generation', 'Mode', 'Generator / Group', 'Access', 'Per user', 'Collected', 'Metadata', 'Status', 'Created'].map(heading => (
                        <th key={heading} className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[10px] font-normal uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 7 }).map((_, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-[var(--border-faint)]">
                        {Array.from({ length: 9 }).map((__, columnIndex) => <td key={columnIndex} className="px-4 py-4"><Skeleton width={columnIndex === 0 ? 'w-32' : 'w-16'} /></td>)}
                      </tr>
                    ))}
                    {!loading && generations.length === 0 && !error && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-[12px] text-[var(--fg-4)] opacity-50">No matching generations found</td></tr>
                    )}
                    {!loading && generations.map(item => {
                      const isGroup = item.generationType === 'group';
                      const perPerson = perPersonLabel(item);
                      const collected = isGroup ? item.paid.accessTotal : item.paid.storedCharge;
                      return (
                        <Fragment key={item.key}>
                          <tr onClick={() => setExpanded(expanded === item.key ? null : item.key)} className="cursor-pointer border-b border-[var(--border-faint)] transition-colors hover:bg-[var(--surface-tint-faint)]">
                            <td className="px-4 py-3.5">
                              <div className="flex max-w-[260px] items-center gap-2.5">
                                <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 flex-shrink-0 stroke-current fill-none stroke-2 text-[var(--fg-4)] transition-transform ${expanded === item.key ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" /></svg>
                                <div className="min-w-0">
                                  <div className="truncate text-[13px] font-medium text-[var(--fg)]" title={item.title}>{item.title || 'Untitled'}</div>
                                  <div className={`mt-0.5 text-[10px] uppercase tracking-[0.08em] ${item.resourceType === 'note' ? 'text-[var(--accent)]' : 'text-[#8b5cf6]'}`}>{item.resourceType}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${isGroup ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>{item.generationType || 'individual'}</span></td>
                            <td className="px-4 py-3.5">
                              <div className="text-[12px] text-[var(--fg-2)]">{item.generator?.username || item.generator?.email || `User ${item.generator?.userId}`}</div>
                              <div className="mt-0.5 max-w-[180px] truncate text-[10.5px] text-[var(--fg-4)]">{item.group?.name || item.generator?.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              {isGroup ? <><div className="text-[12px] text-[var(--fg)]">{item.unlocks.total} unlocked</div><div className="mt-0.5 text-[10.5px] text-[var(--fg-4)]">{item.unlocks.original} original · {item.unlocks.later} later</div></> : <span className="text-[11px] text-[var(--fg-4)]">Owner only</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              {perPerson ? <><div className="inline-flex items-center gap-1 text-[12px]"><CreditIcon className="h-3.5 w-3.5" />{perPerson}</div>{item.paid.nextUnlock != null && <div className="mt-0.5 text-[10px] text-[var(--fg-4)]">next {fmtCredit(item.paid.nextUnlock)}</div>}</> : <span className="text-[11px] text-[var(--fg-4)]">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-[12px]"><CreditAmount value={collected} /></td>
                            <td className="px-4 py-3.5">
                              {item.resourceType === 'note' ? <><div className="text-[11.5px] capitalize text-[var(--fg-3)]">{item.metadata.style || 'Default style'}</div><div className="mt-0.5 text-[10px] text-[var(--fg-4)]">{item.metadata.totalTokens == null ? '—' : `${Number(item.metadata.totalTokens).toLocaleString()} tokens`}</div></> : <><div className="text-[11.5px] text-[var(--fg-3)]">{formatDuration(item.metadata.durationSeconds)}</div><div className="mt-0.5 max-w-[130px] truncate text-[10px] text-[var(--fg-4)]" title={item.metadata.model}>{item.metadata.model || '—'}</div></>}
                            </td>
                            <td className="px-4 py-3.5"><span className={`text-[10.5px] capitalize ${['completed', 'success', 'ready'].includes(String(item.status).toLowerCase()) ? 'text-[#22c55e]' : 'text-[var(--fg-4)]'}`}>{item.status || '—'}</span></td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-[10.5px] text-[var(--fg-4)]">{formatDate(item.createdAt)}</td>
                          </tr>
                          <AnimatePresence initial={false}>
                            {expanded === item.key && (
                              <tr className="border-b border-[var(--border-faint)]">
                                <td colSpan={9} className="bg-[var(--surface-raised)] p-0">
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <div className="px-10 py-4">
                                      <div className="mb-3 flex items-center justify-between">
                                        <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">Access receipts</div>
                                        <div className="text-[10px] text-[var(--fg-4)]">Stored resource charge: <span className="text-[var(--fg-3)]">{fmtCredit(item.paid.storedCharge)}</span></div>
                                      </div>
                                      {item.participants.length === 0 ? (
                                        <div className="rounded-lg border border-[var(--border-faint)] px-4 py-3 text-[11px] text-[var(--fg-4)]">No group access receipts for this resource.</div>
                                      ) : (
                                        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                                          {item.participants.map(participant => (
                                            <div key={participant.userId} className="flex items-center justify-between rounded-lg border border-[var(--border-faint)] bg-[var(--surface)] px-3.5 py-2.5">
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-2"><span className="truncate text-[11.5px] text-[var(--fg-2)]">{participant.username || `User ${participant.userId}`}</span><span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${participant.isOriginal ? 'bg-[rgba(0,212,200,0.08)] text-[var(--accent)]' : 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'}`}>{participant.isOriginal ? 'Original' : 'Later'}</span></div>
                                                <div className="mt-0.5 truncate text-[10px] text-[var(--fg-4)]">{participant.email || `User ID ${participant.userId}`} · {formatDate(participant.unlockedAt)}</div>
                                              </div>
                                              <div className="ml-4 flex-shrink-0 text-[11.5px]"><CreditAmount value={participant.paidAmount} /></div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {truncated && <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2 text-center text-[10.5px] text-[var(--fg-4)]">Showing the newest 300 matching generations. Narrow the filters or search to find older records.</div>}
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
