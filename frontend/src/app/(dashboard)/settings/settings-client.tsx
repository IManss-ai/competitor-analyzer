'use client';

import { useEffect, useRef, useState } from 'react';
import { Competitor, SettingsData } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { Lock, Mail, Check, ExternalLink, Trash2, Plus, Bell, Calendar, User as UserIcon, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface SettingsClientProps {
  initialSettings: SettingsData;
  initialCompetitors: Competitor[];
  userId: string;
  checkoutUrl: string;
  portalUrl: string;
}

const statusConfig: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-600',
    text: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  trialing: {
    label: 'Trial',
    dot: 'bg-[var(--accent-primary)]',
    text: 'text-[var(--accent-primary)]',
    bg: 'bg-[var(--accent-subtle)]',
    border: 'border-[var(--accent-border)]',
  },
  canceled: {
    label: 'Canceled',
    dot: 'bg-red-600',
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
  past_due: {
    label: 'Past due',
    dot: 'bg-amber-600',
    text: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
  },
};

export default function SettingsClient({
  initialSettings,
  initialCompetitors,
  userId,
  checkoutUrl,
  portalUrl,
}: SettingsClientProps) {
  const api = createApiClient(userId);
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'notifications' | 'competitors' | 'billing'>('profile');

  // Form states
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Notifications state
  const [notifStatus, setNotifStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Add Competitor state
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isAdding, setIsAdding] = useState(false);

  // Transient toast for failures on actions that have no inline status banner
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Update business type or schedule
  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      const payload = { [key]: value };
      const updated = await api.fetch<any>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setSettings(updated);
    } catch (e) {
      console.error(e);
      showToast('Failed to update settings');
    }
  };

  // Change password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordStatus({ type: 'error', message: 'Password cannot be empty' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    try {
      await api.fetch<any>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: 'Failed to update password' });
    }
  };

  // Save notification preferences
  const handleNotificationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.fetch<any>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          email_notifications: (settings as any).email_notifications,
          digest_email: (settings as any).digest_email,
        }),
      });
      setSettings(updated);
      setNotifStatus({ type: 'success', message: 'Notifications saved successfully!' });
    } catch (err) {
      setNotifStatus({ type: 'error', message: 'Failed to save notifications' });
    }
  };

  // Toggle Competitor status
  const handleToggleCompetitor = async (comp: Competitor) => {
    try {
      const updatedComp = await api.updateCompetitor(comp.id, { active: !comp.active });
      setCompetitors(competitors.map(c => c.id === comp.id ? { ...c, active: updatedComp.active } : c));
    } catch (e) {
      console.error(e);
      showToast('Failed to update competitor status');
    }
  };

  // Delete Competitor
  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor? This will stop tracking it.')) return;
    try {
      await api.deleteCompetitor(id);
      setCompetitors(competitors.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
      showToast('Failed to delete competitor');
    }
  };

  // Add Competitor
  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) {
      setAddStatus({ type: 'error', message: 'Competitor URL is required' });
      return;
    }
    setIsAdding(true);
    setAddStatus({ type: null, message: '' });
    try {
      const res = await api.addCompetitor(newUrl, newName);
      // Fetch latest list to get all details
      const fresh = await api.getCompetitors(true);
      setCompetitors(fresh.competitors);
      setNewUrl('');
      setNewName('');
      setAddStatus({ type: 'success', message: 'Competitor added and scan queued in background!' });
    } catch (err: any) {
      setAddStatus({ type: 'error', message: err.message || 'Failed to add competitor' });
    } finally {
      setIsAdding(false);
    }
  };

  const statusCfg = statusConfig[settings.subscription_status] ?? {
    label: settings.subscription_status,
    dot: 'bg-[var(--text-muted)]',
    text: 'text-[var(--text-secondary)]',
    bg: 'bg-[var(--fill-subtle-hover)]',
    border: 'border-[var(--border-default)]',
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-12">
      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 px-4 py-3 text-[12px] font-medium flex items-center gap-2.5"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--error-border, rgba(185,28,28,0.25))',
            color: 'var(--error-text, #b91c1c)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <AlertTriangle size={14} />
          {toast}
        </div>
      )}
      {/* Left Navigation Sidebar */}
      <aside className="lg:w-56 flex-shrink-0">
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 sticky top-6 border-b lg:border-b-0 border-[var(--border-subtle)]">
          {[
            { id: 'profile', label: 'Profile', Icon: UserIcon },
            { id: 'schedule', label: 'Scan Schedule', Icon: Calendar },
            { id: 'notifications', label: 'Notifications', Icon: Bell },
            { id: 'competitors', label: 'Competitors', Icon: Trash2 },
            { id: 'billing', label: 'Billing & Plan', Icon: ExternalLink },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)] border-b-[2px] lg:border-b-0 lg:border-l-[3px] border-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--fill-subtle-hover)] hover:text-[var(--text-primary)]'
              )}
            >
              <tab.Icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 max-w-2xl">
        
        {/* A) PROFILE SECTION */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Profile settings</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your login email, security settings, and business profile.</p>
            </div>

            {/* General Profile Card */}
            <div className="rs-card p-5 space-y-4">
              <div>
                <label className="rs-label block mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  disabled
                  value={settings.email}
                  className="rs-input opacity-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="rs-label block mb-1.5">
                  Business type
                </label>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Toggles features specific to your business model.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'saas', title: 'B2B SaaS', desc: 'Price pages, feature tracking, plans' },
                    { id: 'local', title: 'Local Business', desc: 'Google Maps, reviews, social tracking' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleUpdateSetting('business_type', item.id)}
                      className={clsx(
                        'border p-3.5 text-left cursor-pointer transition-all',
                        settings.business_type === item.id
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]'
                          : 'border-[var(--border-subtle)] bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)]'
                      )}
                    >
                      <p className="text-sm font-semibold" style={{ color: settings.business_type === item.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {item.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="rs-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Lock size={16} />
                Change Password
              </h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="rs-label block mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rs-input"
                  />
                </div>
                <div>
                  <label className="rs-label block mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rs-input"
                  />
                </div>

                {passwordStatus.type && (
                  <p className={clsx('text-xs font-medium', passwordStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                    {passwordStatus.message}
                  </p>
                )}

                <button
                  type="submit"
                  className="rs-btn-primary cursor-pointer"
                >
                  Update password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* B) SCAN SCHEDULE SECTION */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Scan schedule</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure how frequently Rivalscope crawls and scans tracked sites.</p>
            </div>

            <div className="rs-card p-5 space-y-4">
              <div className="space-y-3">
                {[
                  { id: 'weekly', title: 'Weekly Scans', desc: 'Scans run every Monday at 8:00 AM UTC. Best for standard competitive tracking.' },
                  { id: 'biweekly', title: 'Bi-weekly Scans', desc: 'Scans run every Monday and Thursday at 8:00 AM UTC. Recommended for fast-moving markets.' }
                ].map((item) => (
                  <label
                    key={item.id}
                    className={clsx(
                      'flex items-start gap-4 border p-4 cursor-pointer transition-all',
                      (settings as any).scan_schedule === item.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border-subtle)] bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)]'
                    )}
                  >
                    <input
                      type="radio"
                      name="scan_schedule"
                      value={item.id}
                      checked={(settings as any).scan_schedule === item.id}
                      onChange={() => handleUpdateSetting('scan_schedule', item.id)}
                      className="mt-1 accent-[var(--accent-primary)] cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* C) NOTIFICATIONS SECTION */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Notification preferences</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Control how and where you receive intelligence briefings and change alerts.</p>
            </div>

            <form onSubmit={handleNotificationsSubmit} className="rs-card p-5 space-y-6">
              <label className="flex items-start gap-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!(settings as any).email_notifications}
                  onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked } as any)}
                  className="mt-1 accent-[var(--accent-primary)] cursor-pointer"
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Send weekly intelligence digest email</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Receive a summary of competitor activity and generated talking points.</p>
                </div>
              </label>

              <div>
                <label className="rs-label block mb-1.5">
                  Digest delivery email
                </label>
                <input
                  type="email"
                  value={(settings as any).digest_email || ''}
                  onChange={(e) => setSettings({ ...settings, digest_email: e.target.value } as any)}
                  placeholder={settings.email}
                  className="rs-input"
                />
              </div>

              {notifStatus.type && (
                <p className={clsx('text-xs font-medium', notifStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                  {notifStatus.message}
                </p>
              )}

              <button
                type="submit"
                className="rs-btn-primary cursor-pointer"
              >
                Save notifications
              </button>
            </form>
          </div>
        )}

        {/* D) COMPETITORS SECTION */}
        {activeTab === 'competitors' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Competitors list</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage tracked websites, enable/disable scanning, or add new competitors.</p>
            </div>

            {/* Quick List */}
            <div className="rs-card overflow-hidden">
              <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--fill-subtle)]">
                <h3 className="rs-label">Tracked competitors</h3>
              </div>

              {competitors.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No competitors added yet. Use the form below to add one.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {competitors.map((comp) => {
                    const cleanUrl = comp.url.replace(/https?:\/\/(www\.)?/, '');
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanUrl}&sz=32`;
                    
                    return (
                      <div key={comp.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={faviconUrl}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/favicon.ico';
                            }}
                            className="w-7 h-7 rounded border border-[var(--border-default)] bg-[var(--fill-subtle)] p-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {comp.name || comp.url}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{comp.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Enable/Disable Toggle */}
                          <label className="inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={comp.active}
                              onChange={() => handleToggleCompetitor(comp)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[var(--fill-subtle-hover)] peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-raised)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-strong)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)] relative"></div>
                            <span className="ml-2 text-xs font-semibold min-w-[48px]" style={{ color: 'var(--text-secondary)' }}>
                              {comp.active ? 'Active' : 'Paused'}
                            </span>
                          </label>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteCompetitor(comp.id)}
                            className="text-[var(--text-secondary)] hover:text-red-600 p-1.5 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Competitor Card */}
            <div className="rs-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Plus size={16} />
                Add new competitor
              </h3>
              <form onSubmit={handleAddCompetitor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="rs-label block mb-1.5">Competitor Name (optional)</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="rs-input"
                    />
                  </div>
                  <div>
                    <label className="rs-label block mb-1.5">Competitor Website (URL)</label>
                    <input
                      type="text"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="e.g. acme.com"
                      className="rs-input"
                    />
                  </div>
                </div>

                {addStatus.type && (
                  <p className={clsx('text-xs font-medium', addStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                    {addStatus.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isAdding}
                  className="rs-btn-primary cursor-pointer flex items-center gap-2"
                >
                  {isAdding ? 'Adding...' : 'Add competitor'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* E) BILLING & PLAN SECTION */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Subscription & billing</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage payment details, upgrade your account, or download invoices.</p>
            </div>

            <div className="rs-card p-5">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Rivalscope Pro</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>$49<span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>/mo</span></span>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[11px] uppercase tracking-wide font-bold',
                        statusCfg.bg,
                        statusCfg.text,
                        statusCfg.border
                      )}
                    >
                      <span className={clsx('w-1 h-1 rounded-full', statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {settings.trial_ends_at && (
                  <div className="text-right">
                    <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                      Trial ends
                    </p>
                    <p className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                      {new Date(settings.trial_ends_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Plan Card Features */}
              <div className="bg-[var(--fill-subtle)] border border-[var(--border-subtle)] p-5 mb-6">
                <p className="rs-label mb-4">Included in Pro plan:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                  {[
                    "Track up to 7 competitors",
                    "Weekly intelligence digest",
                    "AI-generated talking points",
                    "12-week historical trends",
                    "Priority email support"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {portalUrl && (
                <div>
                  <a
                    href={portalUrl}
                    className="rs-btn-primary cursor-pointer"
                  >
                    Manage billing
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {checkoutUrl && (
                <div>
                  <a
                    href={checkoutUrl}
                    className="rs-btn-primary cursor-pointer"
                  >
                    Upgrade to Pro
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
