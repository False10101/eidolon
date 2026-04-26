import { motion } from "framer-motion";

export default function ErrorModal({ message, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111116] shadow-2xl shadow-black/80 surface"
      >
        <div className="flex flex-col items-center px-6 pt-7 pb-6 text-center">
          {/* Icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[#ef4444]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          {/* Title */}
          <div className="mb-2 text-[16px] font-semibold text-[#e8e8ed]">Something went wrong</div>

          {/* Message */}
          <p className="mb-6 text-[13px] leading-[1.7] text-[#9a9aaa]">{message}</p>

          {/* Button */}
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/[0.07] bg-[#18181f] py-2.5 text-[13px] font-medium text-[#9a9aaa] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
}