'use client';

import { useState } from 'react';
import { Check, Edit3, ListChecks } from 'lucide-react';
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

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {actions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <ListChecks className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No pending actions.</p>
          <p className="text-xs text-zinc-400 mt-1">Actions will appear here after a scan detects changes.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {actions.map((action) => (
            <div key={action.id} className="px-6 py-5">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-zinc-900">{action.competitor.name}</span>
                <ChangeBadge type={action.change_event.change_type} />
                <span className="text-xs text-zinc-400 ml-auto">
                  {action.action_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Change context */}
              <p className="text-xs text-zinc-500 mb-3">
                Triggered by: {action.change_event.brief_text}
              </p>

              {/* Draft text */}
              {editingId === action.id ? (
                <div className="mb-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 resize-y"
                  />
                </div>
              ) : (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 mb-3">
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                    {action.edited_text || action.original_draft}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(action.id, editingId === action.id ? editText : undefined)}
                  disabled={approving === action.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {approving === action.id ? 'Approving...' : 'Approve'}
                </button>
                {editingId === action.id ? (
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 border border-zinc-200 text-xs font-medium rounded-lg hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(action.id);
                      setEditText(action.edited_text || action.original_draft);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 text-xs font-medium rounded-lg hover:bg-zinc-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
