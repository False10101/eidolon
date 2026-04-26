'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';

// ─── Nav items ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/home',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    label: 'Inclass Notes',
    href: '/note',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    label: 'Audio Converter',
    href: '/audio-converter',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8]"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  },
  {
    label: 'Transcriptor',
    href: '/transcriptor',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8]"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  },
  {
    label: 'Exam Prep',
    href: '/exam-prep',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8]"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    label: 'Pricing',
    href: '/pricing',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8]"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  },
];

// ─── History config per route ───────────────────────────────────────────────────
const HISTORY_CONFIG = {
  '/note': { api: '/api/note/getHistory', newHref: '/note/new', newLabel: 'New note', detailBase: '/note', hasGroupSplit: true },
  '/transcriptor': { api: '/api/transcript/getHistory', newHref: '/transcriptor', newLabel: 'New transcript', detailBase: '/transcriptor', hasGroupSplit: false },
  '/exam-prep': { api: '/api/exam-prep/getHistory', newHref: '/exam-prep/new', newLabel: 'New exam prep', detailBase: '/exam-prep', hasGroupSplit: true },
};

function getBaseRoute(pathname) {
  return '/' + pathname.split('/')[1];
}

// ─── History item ───────────────────────────────────────────────────────────────
function HistoryItem({ item, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left transition-all duration-100
        ${active
          ? 'border-[#00d4c8] bg-[rgba(0,212,200,0.07)]'
          : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.07]'
        }`}
    >
      <div className={`h-[5px] w-[5px] flex-shrink-0 rounded-full transition-colors ${active ? 'bg-[#00d4c8]' : 'bg-[#2a2a35]'}`} />
      <span className={`flex-1 truncate text-[12.5px] transition-colors ${active ? 'text-[#e8e8ed]' : 'text-[#9a9aaa] group-hover:text-[#e8e8ed]'}`}>
        {item.label ?? item.name}
      </span>
    </button>
  );
}

// ─── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex-shrink-0 px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#b4b4c2] select-none">
      {children}
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccessTokenSilently } = useAuth0();

  const [history, setHistory] = useState([]);
  const [groupHistory, setGroupHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const baseRoute = getBaseRoute(pathname);

  // Routes where we show history in the sidebar
  const config = HISTORY_CONFIG[baseRoute] ?? null;

  // On list pages (/note, /exam-prep), we don't show history — just the nav
  const isListPage = pathname === '/note' || pathname === '/exam-prep';
  const showHistory = config && !isListPage;

  // On detail pages (/note/[id], /exam-prep/[id]) we split into group + individual
  const isDetailPage = showHistory && pathname !== baseRoute && config?.hasGroupSplit;

  useEffect(() => {
    if (!showHistory) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(config.api, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (isDetailPage) {
          setGroupHistory(data.group ?? []);
          setHistory(data.individual ?? []);
        } else {
          setHistory(data.history ?? []);
        }
      } catch (err) {
        console.error('History fetch failed:', err);
        setHistory([]);
        setGroupHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [baseRoute]);

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col border-r border-white/[0.05] bg-[#111116] overflow-hidden surface">

      {/* Nav links */}
      <nav className="flex-shrink-0 border-b border-white/[0.07] py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href + '/'));
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex w-full items-center gap-2.5 border-l-2 px-4 py-[7px] text-[13px] transition-all duration-150
                ${active
                  ? 'border-[#00d4c8] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                  : 'border-transparent text-[#9a9aaa] hover:bg-white/[0.03] hover:border-white/[0.07] hover:text-[#e8e8ed]'
                }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* New button */}
      {config && (
        <div className="flex-shrink-0 border-b border-white/[0.07] p-3">
          <button
            onClick={() => router.push(config.newHref)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00d4c8] py-2 text-[13px] font-medium text-[#0c0c0e] transition-opacity hover:opacity-85"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {config.newLabel}
          </button>
        </div>
      )}

      {/* History */}
      {showHistory && (
        historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
          </div>
        ) : isDetailPage ? (
          <div className="flex flex-1 flex-col overflow-hidden min-h-0">

            {groupHistory.length > 0 && (
              <div className="flex-[4] min-h-0 flex flex-col border-b border-white/[0.07] overflow-hidden">
                <SectionLabel>Group</SectionLabel>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                  {groupHistory.map((item) => (
                    <HistoryItem
                      key={item.public_id}
                      item={item}
                      active={pathname === `${config.detailBase}/${item.public_id}`}
                      onClick={() => router.push(`${config.detailBase}/${item.public_id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-[6] flex-col overflow-hidden min-h-0">
              <SectionLabel>Individual</SectionLabel>
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                {history.length === 0 ? (
                  <p className="px-4 py-4 text-center text-[12px] text-[#9a9aaa]">No history yet</p>
                ) : history.map((item) => (
                  <HistoryItem
                    key={item.public_id}
                    item={item}
                    active={pathname === `${config.detailBase}/${item.public_id}`}
                    onClick={() => router.push(`${config.detailBase}/${item.public_id}`)}
                  />
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
            {history.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-[#9a9aaa]">No history yet</p>
            ) : (
              <>
                <SectionLabel>Recent</SectionLabel>
                {history.map((item) => (
                  <HistoryItem
                    key={item.public_id}
                    item={item}
                    active={pathname === `${config.detailBase}/${item.public_id}`}
                    onClick={() => router.push(`${config.detailBase}/${item.public_id}`)}
                  />
                ))}
              </>
            )}
          </div>
        )
      )}
    </aside>
  );
}