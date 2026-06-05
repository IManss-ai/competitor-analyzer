'use client';

import { useState } from 'react';
import { Check, Pencil, X, Copy, CheckCircle2, RefreshCw } from 'lucide-react';
import ChangeBadge from '@/components/change-badge';
import type { QueueAction } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';

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
      <div className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl shadow-sm">
        <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] px-6 py-24 text-center">
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
              <CheckCircle2 size={32}  className="text-emerald-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-[#0a0a0a] tracking-tight mb-2">Queue is clear</h3>
          <p className="text-sm text-[#525252] max-w-sm mx-auto mb-8">
            All action drafts have been reviewed. You&apos;re up to date with your competitors&apos; moves.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
            Scan for new changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              initial={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl transition-all group">
                <div className={`bg-white border border-zinc-100 border-l-[4px] ${borderColorClass} rounded-[calc(1rem-0.125rem)] p-5 shadow-sm flex flex-col ${approvedId === action.id ? 'bg-emerald-50/40 border-emerald-200' : ''}`}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <span className="text-base font-semibold text-[#0a0a0a]">
                      {action.competitor.name}
                    </span>
                    <ChangeBadge type={action.change_event.change_type} />
                    <span className="ml-auto inline-flex items-center text-[9px] uppercase font-mono tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                      {action.action_type.replace(/_/g, ' ')}
                    </span>
                    {action.change_event.detected_at && (
                      <span className="text-[10px] text-[#a3a3a3] font-mono border border-zinc-200/40 px-2 py-0.5 rounded bg-zinc-50">
                        {new Date(action.change_event.detected_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Trigger */}
                  <div className="bg-zinc-50 border border-zinc-200/40 rounded-lg p-3.5 mb-4 relative">
                    <span className="absolute -top-2.5 left-3 bg-zinc-50 border border-zinc-200/30 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-[#8a8a8a]">
                      triggered by
                    </span>
                    <p className="text-sm text-[#525252] leading-relaxed mt-1">
                      {action.change_event.brief_text}
                    </p>
                  </div>

                  {/* Draft Text Content */}
                  {editingId === action.id ? (
                    <div className="mb-4">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={5}
                        className="w-full bg-white border border-blue-400 rounded-lg px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-y transition-all font-mono leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="bg-[#0a0a0f] border border-white/5 rounded-lg p-4 mb-4 relative group/code shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                      <p className="text-[13px] text-white/95 whitespace-pre-wrap leading-relaxed font-mono selection:bg-blue-500/30 pr-10">
                        {action.edited_text || action.original_draft}
                      </p>
                      <button
                        onClick={() => handleCopy(action.id, action.edited_text || action.original_draft)}
                        className="absolute top-3 right-3 p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors opacity-0 group-hover/code:opacity-100 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === action.id ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-3 mt-auto">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -0.5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        handleApprove(
                          action.id,
                          editingId === action.id ? editText : undefined
                        )
                      }
                      disabled={approving === action.id || approvedId === action.id}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {approving === action.id ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Check size={15}  />
                      )}
                      <span>{approving === action.id ? 'Approving...' : 'Approve action'}</span>
                    </motion.button>

                    {editingId === action.id ? (
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-200/80 text-sm font-medium rounded-lg text-[#525252] hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(action.id);
                          setEditText(action.edited_text || action.original_draft);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-200/80 text-sm font-medium rounded-lg text-[#525252] hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                        <span>Edit draft</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
