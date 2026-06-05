'use client';

import { useState } from 'react';
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
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  trialing: {
    label: 'Trial',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  canceled: {
    label: 'Canceled',
    dot: 'bg-red-400',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  past_due: {
    label: 'Past due',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
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
      alert('Failed to update settings');
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
      alert('Failed to update competitor status');
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
      alert('Failed to delete competitor');
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
    dot: 'bg-zinc-400',
    text: 'text-zinc-600',
    bg: 'bg-zinc-100',
    border: 'border-zinc-200',
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-12">
      {/* Left Navigation Sidebar */}
      <aside className="lg:w-56 flex-shrink-0">
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 sticky top-6 border-b lg:border-b-0 border-[#e5e5e5]">
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
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-neutral-100 text-[#171717] font-semibold'
                  : 'text-[#737373] hover:bg-neutral-50 hover:text-[#171717]'
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
              <h2 className="text-lg font-semibold text-[#171717] mb-1">Profile settings</h2>
              <p className="text-sm text-[#737373]">Manage your login email, security settings, and business profile.</p>
            </div>

            {/* General Profile Card */}
            <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  disabled
                  value={settings.email}
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm bg-neutral-50 text-[#737373] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider mb-1">
                  Business type
                </label>
                <p className="text-xs text-[#737373] mb-3">Toggles features specific to your business model.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'saas', title: 'B2B SaaS', desc: 'Price pages, Jina scraping, features' },
                    { id: 'local', title: 'Local Business', desc: 'Google Maps, reviews, social tracking' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleUpdateSetting('business_type', item.id)}
                      className={clsx(
                        'border p-3.5 rounded-xl text-left cursor-pointer transition-all',
                        settings.business_type === item.id
                          ? 'border-[#2563eb] bg-blue-50/20'
                          : 'border-[#e5e5e5] hover:bg-neutral-50'
                      )}
                    >
                      <p className={clsx('text-sm font-semibold', settings.business_type === item.id ? 'text-[#2563eb]' : 'text-[#171717]')}>
                        {item.title}
                      </p>
                      <p className="text-xs text-[#737373] mt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[#171717] mb-3 flex items-center gap-2">
                <Lock size={16} />
                Change Password
              </h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#737373] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#737373] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                  />
                </div>

                {passwordStatus.type && (
                  <p className={clsx('text-xs font-medium', passwordStatus.type === 'success' ? 'text-green-600' : 'text-red-600')}>
                    {passwordStatus.message}
                  </p>
                )}

                <button
                  type="submit"
                  className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
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
              <h2 className="text-lg font-semibold text-[#171717] mb-1">Scan schedule</h2>
              <p className="text-sm text-[#737373]">Configure how frequently Competitor Analyzer crawls and scans tracked sites.</p>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-5 space-y-4">
              <div className="space-y-3">
                {[
                  { id: 'weekly', title: 'Weekly Scans', desc: 'Scans run every Monday at 8:00 AM UTC. Best for standard competitive tracking.' },
                  { id: 'biweekly', title: 'Bi-weekly Scans', desc: 'Scans run every Monday and Thursday at 8:00 AM UTC. Recommended for fast-moving markets.' }
                ].map((item) => (
                  <label
                    key={item.id}
                    className={clsx(
                      'flex items-start gap-4 border p-4 rounded-xl cursor-pointer transition-all',
                      (settings as any).scan_schedule === item.id
                        ? 'border-[#2563eb] bg-blue-50/20'
                        : 'border-[#e5e5e5] hover:bg-neutral-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="scan_schedule"
                      value={item.id}
                      checked={(settings as any).scan_schedule === item.id}
                      onChange={() => handleUpdateSetting('scan_schedule', item.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">{item.title}</p>
                      <p className="text-xs text-[#737373] mt-1">{item.desc}</p>
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
              <h2 className="text-lg font-semibold text-[#171717] mb-1">Notification preferences</h2>
              <p className="text-sm text-[#737373]">Control how and where you receive intelligence briefings and change alerts.</p>
            </div>

            <form onSubmit={handleNotificationsSubmit} className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-5 space-y-6">
              <label className="flex items-start gap-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!(settings as any).email_notifications}
                  onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked } as any)}
                  className="mt-1 rounded border-[#e5e5e5] text-[#2563eb] focus:ring-[#2563eb]/20"
                />
                <div>
                  <p className="text-sm font-semibold text-[#171717]">Send weekly intelligence digest email</p>
                  <p className="text-xs text-[#737373] mt-0.5">Receive a summary of competitor activity and generated talking points.</p>
                </div>
              </label>

              <div>
                <label className="block text-xs font-semibold text-[#737373] uppercase tracking-wider mb-1.5">
                  Digest delivery email
                </label>
                <input
                  type="email"
                  value={(settings as any).digest_email || ''}
                  onChange={(e) => setSettings({ ...settings, digest_email: e.target.value } as any)}
                  placeholder={settings.email}
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                />
              </div>

              {notifStatus.type && (
                <p className={clsx('text-xs font-medium', notifStatus.type === 'success' ? 'text-green-600' : 'text-red-600')}>
                  {notifStatus.message}
                </p>
              )}

              <button
                type="submit"
                className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
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
              <h2 className="text-lg font-semibold text-[#171717] mb-1">Competitors list</h2>
              <p className="text-sm text-[#737373]">Manage tracked websites, enable/disable scanning, or add new competitors.</p>
            </div>

            {/* Quick List */}
            <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#e5e5e5] bg-[#fafafa]">
                <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Tracked competitors</h3>
              </div>

              {competitors.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#737373]">
                  No competitors added yet. Use the form below to add one.
                </div>
              ) : (
                <div className="divide-y divide-[#e5e5e5]">
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
                            className="w-7 h-7 rounded border border-[#e5e5e5] bg-white p-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#171717] truncate">
                              {comp.name || comp.url}
                            </p>
                            <p className="text-xs text-[#737373] truncate">{comp.url}</p>
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
                            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 relative"></div>
                            <span className="ml-2 text-xs font-semibold text-[#737373] min-w-[48px]">
                              {comp.active ? 'Active' : 'Paused'}
                            </span>
                          </label>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteCompetitor(comp.id)}
                            className="text-[#737373] hover:text-red-600 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
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
            <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[#171717] mb-3 flex items-center gap-2">
                <Plus size={16} />
                Add new competitor
              </h3>
              <form onSubmit={handleAddCompetitor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#737373] mb-1">Competitor Name (optional)</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#737373] mb-1">Competitor Website (URL)</label>
                    <input
                      type="text"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="e.g. acme.com"
                      className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                {addStatus.type && (
                  <p className={clsx('text-xs font-medium', addStatus.type === 'success' ? 'text-green-600' : 'text-red-600')}>
                    {addStatus.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isAdding}
                  className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2"
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
              <h2 className="text-lg font-semibold text-[#171717] mb-1">Subscription & billing</h2>
              <p className="text-sm text-[#737373]">Manage payment details, upgrade your account, or download invoices.</p>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-5">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-base font-semibold text-[#171717] mb-2">Competitor Analyzer Pro</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-[#171717]">$49<span className="text-sm text-[#737373] font-normal">/mo</span></span>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] uppercase tracking-wide font-bold',
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
                    <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wide mb-1">
                      Trial ends
                    </p>
                    <p className="text-sm font-mono font-medium text-[#171717]">
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
              <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-5 mb-6">
                <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-4">Included in Pro plan:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                  {[
                    "Track up to 7 competitors",
                    "Weekly intelligence digest",
                    "AI-generated talking points",
                    "12-week historical trends",
                    "Priority email support"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={14} className="text-[#16a34a] flex-shrink-0"  />
                      <span className="text-sm text-[#171717]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {portalUrl && (
                <div>
                  <a
                    href={portalUrl}
                    className="inline-flex items-center gap-2 bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-2 bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
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
