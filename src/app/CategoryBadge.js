'use client';

export default function CategoryBadge({ category, muted = false, className = '' }) {
  if (!category) return null;

  const label = [category.course_name, category.period_label].filter(Boolean).join(' / ');

  return (
    <span
      title={label}
      className={`inline-flex min-w-0 max-w-[220px] flex-shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] transition-colors ${
        muted
          ? 'border-[var(--border)] bg-transparent text-[var(--fg-4)] opacity-80'
          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-3)] hover:border-[var(--border-strong)]'
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="mr-1.5 h-2.5 w-2.5 flex-shrink-0 fill-none stroke-current stroke-[2]"
        style={{ color: category.color || '#00d4c8', opacity: muted ? 0.7 : 1 }}
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
      
      {/* Course Name: Brighter and slightly bolder */}
      <span
        className="truncate font-medium"
        style={{ color: category.color || '#00d4c8', opacity: muted ? 0.72 : 1 }}
      >
        {category.course_name}
      </span>
      
      {category.period_label && (
        <>
          {/* Clear separator with wide margins to physically break the words apart */}
          <span
            className="mx-1.5 flex-shrink-0 text-[10px]"
            style={{ color: category.color || '#00d4c8', opacity: muted ? 0.35 : 0.45 }}
          >
            /
          </span>
          {/* Period Label: Dimmer to act as secondary metadata */}
          <span
            className="truncate"
            style={{ color: category.color || '#00d4c8', opacity: muted ? 0.55 : 0.7 }}
          >
            {category.period_label}
          </span>
        </>
      )}
    </span>
  );
}
