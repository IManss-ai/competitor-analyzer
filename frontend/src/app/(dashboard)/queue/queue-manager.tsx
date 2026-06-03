'use client';

import { useState } from 'react';
import { Check, PencilSimple, X, ClipboardText, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react';
import ChangeBadge from '@/components/change-badge';
import type { QueueAction } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface QueueManagerProps {
  initialActions: QueueAction[];
  userId: string;
}

export default function QueueManager({ initialActions, userId }: QueueManagerProps) {
  const [actions, setActions] = useState(initialActions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [approving, setApproving] = useState<string | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleApprove = async (id: string, editedText?: string) => {
    setApproving(id);
    try {
      const res = await fetch(`${apiUrl}/api/v1/queue/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ edited_text: editedText }),
      });
      if (res.ok) {
        setApprovedId(id);
        setTimeout(() => {
          setActions((prev) => prev.filter((a) => a.id !== id));
          setEditingId(null);
          setApprovedId(null);
        }, 200);
      }
    } catch {
      // ignore
    } finally {
      setApproving(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (actions.length === 0) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-xl px-6 py-24 text-center shadow-sm">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <motion.div 
            className="absolute inset-0 border border-emerald-200 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute inset-2 border border-emerald-100 rounded-full"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={32} weight="fill" className="text-emerald-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-[#0a0a0a] tracking-tight mb-2">Queue is clear</h3>
        <p className="text-sm text-[#525252] max-w-sm mx-auto mb-8">
          All action drafts have been reviewed. You're up to date with your competitors' moves.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all"
        >
          <ArrowsClockwise size={16} />
          Scan for new changes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {actions.map((action) => {
          const borderColorClass = {
            pricing: 'border-l-amber-500',
            feature: 'border-l-emerald-500',
            repositioning: 'border-l-blue-500',
            copy: 'border-l-zinc-500'
          }[action.change_event.change_type] || 'border-l-zinc-400';

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`bg-white border border-[#e5e5e5] border-l-[4px] ${borderColorClass} rounded-xl p-5 hover:shadow-sm transition-all flex flex-col ${approvedId === action.id ? 'bg-emerald-50 border-emerald-200' : ''}`}>
                
                {/* Header */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-base font-semibold text-[#0a0a0a]">
                    {action.competitor.name}
                  </span>
                  <ChangeBadge type={action.change_event.change_type} />
                  <span className="ml-auto inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    {action.action_type.replace(/_/g, ' ')}
                  </span>
                  {action.change_event.detected_at && (
                    <span className="text-[11px] text-[#a3a3a3] font-mono border border-[#e5e5e5] px-2 py-0.5 rounded bg-[#fafafa]">
                      {new Date(action.change_event.detected_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Trigger */}
                <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-lg p-3 mb-4 relative">
                  <span className="absolute -top-2.5 left-3 bg-[#fafafa] px-1 text-[10px] font-semibold uppercase tracking-wide text-[#a3a3a3]">
                    Triggered by
                  </span>
                  <p className="text-sm text-[#525252] leading-relaxed">
                    {action.change_event.brief_text}
                  </p>
                </div>

                {/* Draft text */}
                {editingId === action.id ? (
                  <div className="mb-4">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={5}
                      className="w-full bg-white border border-blue-300 rounded-lg px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-y transition-all font-mono leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="bg-[#0a0a0a] rounded-lg p-4 mb-4 relative group">
                    <p className="text-[13px] text-white/90 whitespace-pre-wrap leading-relaxed font-mono selection:bg-blue-500/30">
                      {action.edited_text || action.original_draft}
                    </p>
                    <button 
                      onClick={() => handleCopy(action.id, action.edited_text || action.original_draft)}
                      className="absolute top-2 right-2 p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy to clipboard"
                    >
                      {copiedId === action.id ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <ClipboardText size={16} />
                      )}
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() =>
                      handleApprove(
                        action.id,
                        editingId === action.id ? editText : undefined
                      )
                    }
                    disabled={approving === action.id || approvedId === action.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all disabled:opacity-50"
                  >
                    {approving === action.id ? (
                      <ArrowsClockwise size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} weight="bold" />
                    )}
                    {approving === action.id ? 'Approving...' : 'Approve action'}
                  </motion.button>

                  {editingId === action.id ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-[#e5e5e5] text-sm font-medium rounded-lg text-[#525252] hover:bg-[#fafafa] transition-colors"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(action.id);
                        setEditText(action.edited_text || action.original_draft);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-[#e5e5e5] text-sm font-medium rounded-lg text-[#525252] hover:bg-[#fafafa] transition-colors"
                    >
                      <PencilSimple size={16} />
                      Edit draft
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
