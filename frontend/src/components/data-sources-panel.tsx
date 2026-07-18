'use client';

import { useState } from 'react';
import { Database, Pencil, Check, X, ExternalLink, Loader2, Wand2 } from 'lucide-react';
import { useApiToken } from '@/lib/use-api-token';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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
  const apiToken = useApiToken();
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
          Authorization: `Bearer ${apiToken ?? userId}`,
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
        headers: { Authorization: `Bearer ${apiToken ?? userId}` },
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
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Data Sources
            </h3>
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border border-border text-muted-foreground">
              {connectedCount}/{SAAS_FIELDS.length} connected
            </span>
          </div>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startEdit}
              className="cursor-pointer"
            >
              <Pencil size={12} />
              Edit
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Override auto-derived URLs when the homepage domain doesn&apos;t match the platform slug. Setting a Careers URL enables hiring-signal tracking.
        </p>

        <div className="space-y-4">
          {SAAS_FIELDS.map((field, index) => {
            const currentValue = values[field.key];
            const draftValue = draft[field.key];
            const isCareers = field.key === 'careers_url';
            return (
              <div key={field.key}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      {isCareers && !currentValue && (
                        <button
                          onClick={detectCareers}
                          disabled={probingCareers}
                          className="text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer text-primary"
                        >
                          {probingCareers ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}
                          {probingCareers ? 'Detecting' : 'Detect'}
                        </button>
                      )}
                      {isCareers && probeResult === 'not-found' && (
                        <span className="text-xs font-mono uppercase tracking-wider text-[var(--tone-warning)]">
                          No common path matched
                        </span>
                      )}
                      {!editing && currentValue && (
                        <a
                          href={currentValue}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1 hover:underline text-primary"
                        >
                          Open <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                  {editing ? (
                    <Input
                      type="url"
                      value={draftValue}
                      onChange={e => updateDraft(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full text-xs font-mono"
                    />
                  ) : (
                    <p
                      className="text-xs font-mono truncate"
                      title={currentValue || 'Auto-derived from homepage'}
                    >
                      {currentValue
                        ? <span className="text-foreground">{currentValue}</span>
                        : <span className="italic text-muted-foreground">Auto-derived from homepage</span>
                      }
                    </p>
                  )}
                  {editing && (
                    <p className="text-xs text-muted-foreground">
                      {field.helpText}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {editing && (
          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
            {error ? (
              <span className="text-xs text-destructive">{error}</span>
            ) : (
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Empty fields clear the override
              </span>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                disabled={saving}
                className="cursor-pointer"
              >
                <X size={12} />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="cursor-pointer"
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
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
