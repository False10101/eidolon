'use client';

import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { locale: 'en', label: 'English',    flag: '🇬🇧' },
  { locale: 'th', label: 'ภาษาไทย',   flag: '🇹🇭' },
  { locale: 'zh', label: '中文',        flag: '🇨🇳' },
  { locale: 'es', label: 'Español',    flag: '🇪🇸' },
  { locale: 'hi', label: 'हिंदी',      flag: '🇮🇳' },
  { locale: 'id', label: 'Indonesia',  flag: '🇮🇩' },
  { locale: 'pt', label: 'Português',  flag: '🇧🇷' },
  { locale: 'fr', label: 'Français',   flag: '🇫🇷' },
];

export { LANGUAGES };

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('en');
  const ref = useRef(null);

  useEffect(() => {
    setCurrent(localStorage.getItem('locale') || 'en');
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const currentLang = LANGUAGES.find(l => l.locale === current) ?? LANGUAGES[0];

  const switchLocale = (locale) => {
    localStorage.setItem('locale', locale);
    setCurrent(locale);
    setOpen(false);
    // Dispatch event so the provider re-loads messages without a full page reload
    window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Switch language"
        className="group flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 transition-all hover:border-[rgba(0,212,200,0.25)] hover:bg-[rgba(0,212,200,0.04)]"
      >
        <span className="text-[13px] leading-none">{currentLang.flag}</span>
        <span className="text-[11px] font-medium text-[var(--fg-3)] group-hover:text-[var(--accent)] transition-colors hidden sm:block">
          {currentLang.locale.toUpperCase()}
        </span>
        <svg viewBox="0 0 24 24" className={`h-2.5 w-2.5 stroke-[var(--fg-3)] fill-none stroke-2 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-[200] w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {LANGUAGES.map(lang => (
            <button
              key={lang.locale}
              onClick={() => switchLocale(lang.locale)}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] transition-colors
                ${lang.locale === current
                  ? 'bg-[rgba(0,212,200,0.06)] text-[var(--accent)]'
                  : 'text-[var(--fg-3)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]'
                }`}
            >
              <span className="text-[14px]">{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {lang.locale === current && (
                <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[var(--accent)] fill-none stroke-[2.5]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
