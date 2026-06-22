'use client';

import { useState } from 'react';
import { Database, Pencil, Check, X, ExternalLink, Loader2, Wand2 } from 'lucide-react';

interface DataSourceField {
  key: 'g2_url' | 'trustpilot_url' | 'capterra_url' | 'careers_url';
  label: string;
  placeholder: string;
  helpText: string;
}

const SAAS_FIELDS: DataSourceField[] = [
  {
    key: 'g2_url',
    label: 'G2 Reviews',
    placeholder: 'https://www.g2.com/products/.../reviews',
    helpText: 'Override the auto-derived G2 URL when domain ≠ product slug.',
  },
  {
    key: 'trustpilot_url',
    label: 'Trustpilot',
    placeholder: 'https://www.trustpilot.com/review/example.com',
    helpText: 'Direct link to the Trustpilot review page.',
  },
  {
    key: 'capterra_url',
    label: 'Capterra',
    placeholder: 'https://www.capterra.com/p/.../',
    helpText: 'Direct link to the Capterra product page.',
  },
  {
    key: 'careers_url',
    label: 'Careers Page',
    placeholder: 'https://example.com/careers',
    helpText: 'Enables hiring-signal tracking for this competitor.',
  },
];

type FieldValues = Record<DataSourceField['key'], string>;

interface DataSourcesPanelProps {
  competitorId: string;
  userId: string;
  initialValues: Partial<FieldValues>;
  onSaved?: (updated: Partial<FieldValues>) => void;
}

export default function DataSourcesPanel({ competitorId, userId, initialValues, onSaved }: DataSourcesPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState<FieldValues>({
    g2_url: initialValues.g2_url ?? '',
    trustpilot_url: initialValues.trustpilot_url ?? '',
    capterra_url: initialValues.capterra_url ?? '',
    careers_url: initialValues.careers_url ?? '',
  });
  const [draft, setDraft] = useState<FieldValues>(values);
  const [probingCareers, setProbingCareers] = useState(false);
  const [probeResult, setProbeResult] = useState<'idle' | 'found' | 'not-found'>('idle');

  const startEdit = () => {
    setDraft(values);
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/competitors/${competitorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        throw new Error('Save failed');
      }
      const updated = await res.json();
      const next: FieldValues = {
        g2_url: updated.g2_url ?? '',
        trustpilot_url: updated.trustpilot_url ?? '',
        capterra_url: updated.capterra_url ?? '',
        careers_url: updated.careers_url ?? '',
      };
      setValues(next);
      setEditing(false);
      onSaved?.(next);
    } catch {
      setError('Could not save. Check the URLs and try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (key: DataSourceField['key'], value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const detectCareers = async () => {
    setProbingCareers(true);
    setProbeResult('idle');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/competitors/${competitorId}/probe-careers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userId}` },
      });
      if (!res.ok) throw new Error('probe failed');
      const data = await res.json();
      if (data.found && data.careers_url) {
        const next: FieldValues = { ...values, careers_url: data.careers_url };
        setValues(next);
        setDraft(prev => ({ ...prev, careers_url: data.careers_url }));
        setProbeResult('found');
        onSaved?.(next);
      } else {
        setProbeResult('not-found');
      }
    } catch {
      setProbeResult('not-found');
    } finally {
      setProbingCareers(false);
    }
  };

  const connectedCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="rs-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Data Sources
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] border border-[var(--border-default)] text-[var(--text-muted)]">
            {connectedCount}/{SAAS_FIELDS.length} connected
          </span>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="rs-btn-ghost !px-3 !py-2 text-xs cursor-pointer"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Override auto-derived URLs when the homepage domain doesn&apos;t match the platform slug. Setting a Careers URL enables hiring-signal tracking.
      </p>

      <div className="space-y-3">
        {SAAS_FIELDS.map(field => {
          const currentValue = values[field.key];
          const draftValue = draft[field.key];
          const isCareers = field.key === 'careers_url';
          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  {isCareers && !currentValue && (
                    <button
                      onClick={detectCareers}
                      disabled={probingCareers}
                      className="text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {probingCareers ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}
                      {probingCareers ? 'Detecting' : 'Detect'}
                    </button>
                  )}
                  {isCareers && probeResult === 'not-found' && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--tone-warning)]">
                      No common path matched
                    </span>
                  )}
                  {!editing && currentValue && (
                    <a
                      href={currentValue}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      Open <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
              {editing ? (
                <input
                  type="url"
                  value={draftValue}
                  onChange={e => updateDraft(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="rs-input w-full !py-2 !px-3 text-xs font-mono"
                />
              ) : (
                <p
                  className="text-xs font-mono truncate"
                  style={{ color: currentValue ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  title={currentValue || 'Auto-derived from homepage'}
                >
                  {currentValue || <span className="italic">Auto-derived from homepage</span>}
                </p>
              )}
              {editing && (
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {field.helpText}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-[var(--border-default)]">
          {error ? (
            <span className="text-xs" style={{ color: 'var(--tone-danger)' }}>{error}</span>
          ) : (
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Empty fields clear the override
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="rs-btn-ghost !px-3 !py-2 text-xs cursor-pointer"
            >
              <X size={12} />
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rs-btn-primary !px-3 !py-2 text-xs cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Check size={12} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
