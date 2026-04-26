import { motion } from 'framer-motion';

export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', loadingLabel, loading = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(239,68,68,0.18)] bg-[#111116] p-7 surface"
      >
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl" style={{ background: 'rgba(239,68,68,0.08)' }} />
        <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[#ef4444] fill-none stroke-[1.8]">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="relative mb-1.5 text-[15px] font-medium text-[#e8e8ed]">{title}</div>
        <p className="relative mb-6 text-[13px] leading-[1.7] text-[#9a9aaa]">{message}</p>
        <div className="relative flex gap-2">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 rounded-lg border border-white/[0.07] bg-[#18181f] py-2.5 text-[13px] text-[#9a9aaa] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed] disabled:opacity-40 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-2.5 text-[13px] font-medium text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.14)] disabled:opacity-60 disabled:cursor-not-allowed">
            {loading && <div className="h-3.5 w-3.5 animate-spin rounded-full border border-transparent border-t-[#ef4444]" />}
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}