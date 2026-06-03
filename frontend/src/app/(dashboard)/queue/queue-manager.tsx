'use client';

import { useState } from 'react';
import { Check, PencilSimple, X, ClipboardText } from '@phosphor-icons/react';
import ChangeBadge from '@/components/change-badge';
import type { QueueAction } from '@/lib/types';

interface QueueManagerProps {
  initialActions: QueueAction[];
  userId: string;
}

export default function QueueManager({ initialActions, userId }: QueueManagerProps) {
  const [actions, setActions] = useState(initialActions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [approving, setApproving] = useState<string | null>(null);

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
        setActions((prev) => prev.filter((a) => a.id !== id));
        setEditingId(null);
      }
    } catch {
      // ignore
    } finally {
      setApproving(null);
    }
  };

  if (actions.length === 0) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-xl px-6 py-16 text-center">
        <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
          <ClipboardText size={18} className="text-[#a3a3a3]" />
        </div>
        <p className="text-sm font-medium text-[#525252] mb-1">Queue is clear</p>
        <p className="text-xs text-[#a3a3a3]">
          Actions appear here after a scan detects changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <div
          key={action.id}
          className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#d4d4d4] transition-colors"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm font-semibold text-[#0a0a0a]">
              {action.competitor.name}
            </span>
            <ChangeBadge type={action.change_event.change_type} />
            <span className="ml-auto text-[11px] font-mono text-[#a3a3a3] capitalize">
              {action.action_type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Trigger */}
          <p className="text-xs text-[#737373] mb-3 leading-relaxed">
            {action.change_event.brief_text}
          </p>

          {/* Draft text */}
          {editingId === action.id ? (
            <div className="mb-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                className="w-full bg-[#fafafa] border border-[#e5e5e5] rounded-lg px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-y transition-all font-mono leading-relaxed"
              />
            </div>
          ) : (
            <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-lg px-4 py-3 mb-3">
              <p className="text-sm text-[#525252] whitespace-pre-wrap leading-relaxed font-mono">
                {action.edited_text || action.original_draft}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleApprove(
                  action.id,
                  editingId === action.id ? editText : undefined
                )
              }
              disabled={approving === action.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0a0a0a] text-white text-xs font-semibold rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Check size={12} weight="bold" />
              {approving === action.id ? 'Approving...' : 'Approve'}
            </button>

            {editingId === action.id ? (
              <button
                onClick={() => setEditingId(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#e5e5e5] text-xs font-medium rounded-lg text-[#525252] hover:bg-[#fafafa] transition-colors"
              >
                <X size={12} />
                Cancel
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingId(action.id);
                  setEditText(action.edited_text || action.original_draft);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#e5e5e5] text-xs font-medium rounded-lg text-[#525252] hover:bg-[#fafafa] transition-colors"
              >
                <PencilSimple size={12} />
                Edit draft
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
