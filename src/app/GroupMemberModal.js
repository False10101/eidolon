'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CreditIcon from '@/app/CreditIcon'; // Adjust path if needed
import LocalCreditPrice from '@/app/LocalCreditPrice';
import { getGroupPerParticipantPrice, getGroupTotalPrice } from '@/lib/groupPricing';

export default function GroupMemberModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  members = [], 
  estimatedCost,
  costLabel = 'Est. Cost Per User'
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Initialize all members as selected when the modal opens
  useEffect(() => {
    if (isOpen && members.length > 0) {
      const allIds = members.map((m) => m.user_id);
      setSelectedIds(new Set(allIds));
    }
  }, [isOpen, members]);

  const toggleMember = (id, isMe) => {
    if (isMe) return; // Prevent unselecting the current user
    
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
  };

  // Calculate estimated cost per user based on selected members
  const baseEstimate = Number(estimatedCost) || 0;
  
  const totalCostEstimate = selectedIds.size > 0
    ? getGroupTotalPrice(baseEstimate, selectedIds.size)
    : 0;
  const perUserEstimate = selectedIds.size > 0
    ? getGroupPerParticipantPrice(baseEstimate, selectedIds.size)
    : baseEstimate;
  const formatCost = (value) => Number.isInteger(value) ? String(value) : value.toFixed(2);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl surface noise"
          >
            {/* Header */}
            <div className="flex flex-col border-b border-[var(--border)] px-6 py-5">
              <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
                Select Group Members
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fg-3)]">
                Choose who will be included in this group generation.
              </p>
            </div>

            {/* Member List */}
            <div className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-y-auto px-6 py-4 custom-scrollbar sm:grid-cols-2">
              {members.map((member) => {
                const isSelected = selectedIds.has(member.user_id);
                return (
                  <div
                    key={member.user_id}
                    onClick={() => toggleMember(member.user_id, member.is_me)}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                      member.is_me ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[rgba(0,212,200,0.35)]'
                    } ${
                      isSelected
                        ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(var(--accent-rgb),0.05)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(0,212,200,0.2)] bg-[var(--surface)]">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.username}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[12px] font-medium text-[var(--fg-3)]">
                            {member.username?.charAt(0)?.toUpperCase() ?? '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--fg)]">
                          {member.username}
                          {member.is_me && (
                            <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--fg-3)] border border-[var(--border)]">
                              You
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-mono text-[var(--fg-3)]">
                          {member.balance} <CreditIcon size={10} />
                        </span>
                      </div>
                    </div>

                    {/* Custom Checkbox */}
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                          : 'border-[var(--fg-4)] bg-transparent'
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 14 14" className="h-3 w-3 fill-none stroke-current stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
                          <polyline points="3 7.5 6 10.5 11 3.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-raised)] px-6 py-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.05em] text-[var(--fg-3)]">
                  {costLabel}
                </span>
                <span className="flex items-center gap-1 font-mono text-[15px] font-semibold text-[var(--accent)]">
                  {perUserEstimate ? `~${formatCost(perUserEstimate)}` : estimatedCost} <CreditIcon size={14} />
                  <LocalCreditPrice credits={perUserEstimate || estimatedCost} />
                </span>
                {selectedIds.size > 1 && (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--fg-3)]">
                    Total: {formatCost(totalCostEstimate)} <CreditIcon size={10} className="opacity-70" />
                    <LocalCreditPrice credits={totalCostEstimate} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-[12.5px] font-medium text-[var(--fg-3)] transition-colors hover:text-[var(--fg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0}
                  className="btn-accent flex items-center gap-2 rounded-lg px-5 py-2 text-[12.5px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Generate
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
