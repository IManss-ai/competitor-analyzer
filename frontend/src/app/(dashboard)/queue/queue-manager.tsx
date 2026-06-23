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
      <div className="rs-card p-6">
        <div className="px-6 py-24 text-center flex flex-col items-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <motion.div
              className="absolute inset-0 border border-[var(--tone-positive)]/20 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-2 border border-[var(--tone-positive)]/10 rounded-full"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute inset-0 rounded-full bg-[var(--tone-positive)]/10 flex items-center justify-center">
              <CheckCircle2 size={32} style={{ color: 'var(--tone-positive)' }} />
            </div>
          </div>
          <h3 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Queue is clear</h3>
          <p className="text-sm max-w-sm mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
            All action drafts have been reviewed. You&apos;re up to date with your competitors&apos; moves.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rs-btn-primary cursor-pointer"
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
          const borderLeftColor = {
            pricing: 'var(--tone-warning)',
            feature: 'var(--tone-positive)',
            repositioning: 'var(--tone-repositioning)',
            copy: 'var(--tone-neutral)'
          }[action.change_event.change_type] || 'var(--tone-neutral)';

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div 
                className={`rs-card p-5 flex flex-col border-l-[4px] ${approvedId === action.id ? 'bg-[var(--tone-positive)]/5 border-[var(--tone-positive)]/20' : ''}`}
                style={{ borderLeftColor: approvedId === action.id ? 'var(--tone-positive)' : borderLeftColor }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {action.competitor.name}
                  </span>
                  <ChangeBadge type={action.change_event.change_type} />
                  <span className="ml-auto inline-flex items-center text-[9px] uppercase font-mono tracking-wider px-3 py-1 rounded-md border border-sky-500/20 text-sky-400 bg-sky-500/10">
                    {action.action_type.replace(/_/g, ' ')}
                  </span>
                  {action.change_event.detected_at && (
                    <span className="text-[10px] font-mono border border-[var(--border-subtle)] px-2 py-0.5 rounded bg-[var(--fill-subtle)]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(action.change_event.detected_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Trigger */}
                <div className="bg-[var(--fill-subtle)] border border-[var(--border-subtle)] rounded p-4 mb-4 relative">
                  <span
                    className="absolute -top-2.5 left-3 border border-[var(--border-subtle)] px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[var(--surface-raised)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    triggered by
                  </span>
                  <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>
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
                        className="rs-input font-mono leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded p-4 mb-4 relative group/code">
                      <p className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-mono selection:bg-sky-500/20 pr-10">
                        {action.edited_text || action.original_draft}
                      </p>
                      <button
                        onClick={() => handleCopy(action.id, action.edited_text || action.original_draft)}
                        className="absolute top-3 right-3 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] rounded-md transition-colors opacity-0 group-hover/code:opacity-100 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === action.id ? (
                          <Check size={14} style={{ color: 'var(--tone-positive)' }} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-3 mt-auto">
                    <motion.button
                      whileTap={{ scale: 0.99 }}
                      onClick={() =>
                        handleApprove(
                          action.id,
                          editingId === action.id ? editText : undefined
                        )
                      }
                      disabled={approving === action.id || approvedId === action.id}
                      className="rs-btn-primary cursor-pointer"
                    >
                      {approving === action.id ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Check size={15}  />
                      )}
                      <span>{approving === action.id ? 'Approving…' : 'Approve action'}</span>
                    </motion.button>

                    {editingId === action.id ? (
                      <button
                        onClick={() => setEditingId(null)}
                        className="rs-btn-ghost cursor-pointer"
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
                        className="rs-btn-ghost cursor-pointer"
                      >
                        <Pencil size={15} />
                        <span>Edit draft</span>
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
