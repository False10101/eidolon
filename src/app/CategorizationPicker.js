'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import CategorizationModal from '@/app/CategorizationModal';

export default function CategorizationPicker({ value, onChange }) {
  const { getAccessTokenSilently } = useAuth0();
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {}
  }, [getAccessTokenSilently]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = async (payload) => {
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setCategories((prev) => [data.category, ...prev.filter((c) => c.id !== data.category.id)]);
        onChange?.(data.category);
        setOpen(false);
      }
    } catch {}
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">Category</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--fg-3)] transition-colors hover:text-[var(--fg)]"
        >
          New
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange?.(null)}
          className={`rounded-lg border px-3 py-2 text-[12px] transition-all ${!value ? 'btn-option-active' : 'btn-option'}`}
        >
          None
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange?.(category)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-all ${value?.id === category.id ? 'btn-option-active' : 'btn-option'}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color || '#00d4c8' }} />
            <span>{category.course_name}</span>
            <span className="text-[var(--fg-4)]">/</span>
            <span className="text-[var(--fg-3)]">{category.period_label}</span>
          </button>
        ))}
      </div>

      <CategorizationModal isOpen={open} onClose={() => setOpen(false)} onCreate={createCategory} />
    </div>
  );
}
