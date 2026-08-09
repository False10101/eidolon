'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function sameCategory(left, right) {
  return String(left?.id) === String(right?.id);
}

export default function CategoryDropdown({ value, categories = [], onChange, onCreate, compact = false }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selectableCategories = useMemo(() => {
    const byId = new Map();
    categories.forEach((category) => {
      if (category?.id != null && category.owned_by_viewer !== false) {
        byId.set(String(category.id), category);
      }
    });
    return [...byId.values()];
  }, [categories]);

  const currentIsShared = Boolean(value)
    && !selectableCategories.some((category) => sameCategory(category, value));

  useEffect(() => {
    if (!open) return;

    const positionMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const openAbove = spaceBelow < 220 && rect.top > spaceBelow;
      const maxHeight = Math.max(150, Math.min(280, openAbove ? rect.top - 12 : spaceBelow));

      setMenuStyle({
        left: rect.left,
        width: rect.width,
        maxHeight,
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    };

    const closeOnOutsideClick = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    positionMenu();
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);

  const choose = (category) => {
    onChange?.(category);
    setOpen(false);
  };

  const menu = open && menuStyle && (
    <div
      ref={menuRef}
      style={menuStyle}
      className="fixed z-[200] overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-2xl"
    >
      {currentIsShared && (
        <div className="mb-1 flex items-center gap-2 rounded-lg border border-[rgba(0,212,200,0.18)] bg-[rgba(0,212,200,0.05)] px-3 py-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: value.color || '#00d4c8' }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] text-[var(--fg)]">{value.course_name}</div>
            <div className="truncate text-[10.5px] text-[var(--fg-3)]">{value.period_label || 'Current shared category'}</div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.06em] text-[var(--accent)]">Current</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => choose(null)}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${!value ? 'bg-[rgba(0,212,200,0.08)] text-[var(--accent)]' : 'text-[var(--fg-2)] hover:bg-[var(--card-hover)]'}`}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border-strong)]">
          {!value && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
        </span>
        <span className="text-[12px]">Uncategorized</span>
      </button>

      {selectableCategories.map((category) => {
        const selected = sameCategory(category, value);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => choose(category)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${selected ? 'bg-[rgba(0,212,200,0.08)]' : 'hover:bg-[var(--card-hover)]'}`}
          >
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: category.color || '#00d4c8' }} />
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[12px] ${selected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>{category.course_name}</div>
              {category.period_label && <div className="truncate text-[10.5px] text-[var(--fg-3)]">{category.period_label}</div>}
            </div>
            {selected && (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[var(--accent)] fill-none stroke-[2.2]">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}

      <div className="my-1 h-px bg-[var(--border)]" />
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onCreate?.();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[var(--accent)] transition-colors hover:bg-[rgba(0,212,200,0.07)]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2]">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Create new category
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`relative w-full rounded-lg border bg-[var(--surface-raised)] text-left text-[var(--fg)] outline-none transition-colors ${open ? 'border-[rgba(0,212,200,0.5)]' : 'border-[rgba(0,212,200,0.25)] hover:border-[rgba(0,212,200,0.4)]'} ${compact ? 'min-h-[32px] py-1.5 pl-2.5 pr-8 text-[12px]' : 'min-h-[38px] py-2 pl-3 pr-8 text-[13px]'}`}
      >
        <span className="block truncate">
          {value
            ? `${value.course_name}${value.period_label ? ` / ${value.period_label}` : ''}`
            : 'Uncategorized'}
        </span>
        <svg viewBox="0 0 24 24" className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[var(--fg-4)] fill-none stroke-[2] transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {typeof document !== 'undefined' && createPortal(menu, document.body)}
    </>
  );
}
