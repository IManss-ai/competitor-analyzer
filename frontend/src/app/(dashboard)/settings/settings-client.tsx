'use client';

import { useEffect, useRef, useState } from 'react';
import { Competitor, SettingsData } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { useMounted } from '@/lib/use-mounted';
import { Lock, Mail, Check, ExternalLink, Trash2, Plus, Bell, Calendar, User as UserIcon, AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import clsx from 'clsx';

interface SettingsClientProps {
  initialSettings: SettingsData;
  initialCompetitors: Competitor[];
  userId: string;
  checkoutUrl: string;
  portalUrl: string;
  initialTab?: SettingsTab;
}

type SettingsTab = 'profile' | 'schedule' | 'notifications' | 'competitors' | 'billing';

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: { label: 'Active', variant: 'default' },
  trialing: { label: 'Trial', variant: 'secondary' },
  canceled: { label: 'Canceled', variant: 'destructive' },
  past_due: { label: 'Past due', variant: 'outline' },
};

export default function SettingsClient({
  initialSettings,
  initialCompetitors,
  userId,
  checkoutUrl,
  portalUrl,
  initialTab,
}: SettingsClientProps) {
  const api = createApiClient(userId);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'profile');
  // Gate the locale-formatted trial date so SSR matches first client render (#418).
  const mounted = useMounted();

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
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read straight from the DOM inputs, falling back to React state — same
    // fix as the login/onboarding forms: password-manager autofill sets
    // input.value without firing React's onChange, leaving state empty.
    const fd = new FormData(e.currentTarget);
    const newVal = (fd.get('new_password') as string) || newPassword || '';
    const confirmVal = (fd.get('confirm_password') as string) || confirmPassword || '';
    if (!newVal) {
      setPasswordStatus({ type: 'error', message: 'Password cannot be empty' });
      return;
    }
    if (newVal !== confirmVal) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    try {
      await api.fetch<any>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ password: newVal }),
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

  // Delete Competitor — confirmed via AlertDialog
  const handleDeleteCompetitor = async (id: string) => {
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

  const statusCfg = statusConfig[settings.subscription_status] ?? { label: settings.subscription_status, variant: 'outline' as const };

  const NAV_TABS = [
    { id: 'profile', label: 'Profile', Icon: UserIcon },
    { id: 'schedule', label: 'Scan Schedule', Icon: Calendar },
    { id: 'notifications', label: 'Notifications', Icon: Bell },
    { id: 'competitors', label: 'Competitors', Icon: Trash2 },
    { id: 'billing', label: 'Billing & Plan', Icon: ExternalLink },
  ] as const;

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-12">
      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 px-4 py-3 text-xs font-medium flex items-center gap-3 bg-popover ring-1 ring-foreground/10 rounded-lg text-destructive shadow-lg"
        >
          <AlertTriangle size={14} />
          {toast}
        </div>
      )}

      {/* Left Navigation Sidebar */}
      <aside className="lg:w-56 flex-shrink-0">
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 sticky top-6 border-b lg:border-b-0 border-border">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors duration-150 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-muted text-foreground border-b-2 lg:border-b-0 lg:border-l-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
              <h2 className="text-lg font-semibold mb-1 text-foreground">Profile settings</h2>
              <p className="text-sm text-muted-foreground">Manage your login email, security settings, and business profile.</p>
            </div>

            {/* General Profile Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-display">Email address</Label>
                  <Input
                    id="email-display"
                    type="email"
                    disabled
                    value={settings.email}
                    className="opacity-50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business type</Label>
                  <p className="text-xs text-muted-foreground">Toggles features specific to your business model.</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { id: 'saas', title: 'B2B SaaS', desc: 'Price pages, feature tracking, plans' },
                      { id: 'local', title: 'Local Business', desc: 'Google Maps, reviews, social tracking' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleUpdateSetting('business_type', item.id)}
                        className={clsx(
                          'border rounded-xl p-4 text-left cursor-pointer transition-colors',
                          settings.business_type === item.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/30 hover:bg-muted/60'
                        )}
                      >
                        <p className={clsx('text-sm font-semibold', settings.business_type === item.id ? 'text-primary' : 'text-foreground')}>
                          {item.title}
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock size={16} />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      name="new_password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      name="confirm_password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>

                  {passwordStatus.type && (
                    <p className={clsx('text-xs font-medium', passwordStatus.type === 'success' ? 'text-[var(--tone-positive)]' : 'text-destructive')}>
                      {passwordStatus.message}
                    </p>
                  )}

                  <Button type="submit">
                    Update password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* B) SCAN SCHEDULE SECTION */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1 text-foreground">Scan schedule</h2>
              <p className="text-sm text-muted-foreground">Configure how frequently Rivalscope crawls and scans tracked sites.</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-3">
                {[
                  { id: 'weekly', title: 'Weekly Scans', desc: 'Scans run every Monday at 8:00 AM UTC. Best for standard competitive tracking.' },
                  { id: 'biweekly', title: 'Bi-weekly Scans', desc: 'Scans run every Monday and Thursday at 8:00 AM UTC. Recommended for fast-moving markets.' }
                ].map((item) => (
                  <label
                    key={item.id}
                    className={clsx(
                      'flex items-start gap-4 border rounded-xl p-4 cursor-pointer transition-colors',
                      (settings as any).scan_schedule === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/60'
                    )}
                  >
                    <input
                      type="radio"
                      name="scan_schedule"
                      value={item.id}
                      checked={(settings as any).scan_schedule === item.id}
                      onChange={() => handleUpdateSetting('scan_schedule', item.id)}
                      className="mt-1 accent-[var(--primary)] cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs mt-1 text-muted-foreground">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* C) NOTIFICATIONS SECTION */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1 text-foreground">Notification preferences</h2>
              <p className="text-sm text-muted-foreground">Control how and where you receive intelligence briefings and change alerts.</p>
            </div>

            <form onSubmit={handleNotificationsSubmit}>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-start gap-4">
                    <Switch
                      id="email-notifications"
                      checked={!!(settings as any).email_notifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked } as any)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="email-notifications" className="cursor-pointer">
                        Send weekly intelligence digest email
                      </Label>
                      <p className="text-xs text-muted-foreground">Receive a summary of competitor activity and generated talking points.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="digest-email">Digest delivery email</Label>
                    <Input
                      id="digest-email"
                      type="email"
                      value={(settings as any).digest_email || ''}
                      onChange={(e) => setSettings({ ...settings, digest_email: e.target.value } as any)}
                      placeholder={settings.email}
                    />
                  </div>

                  {notifStatus.type && (
                    <p className={clsx('text-xs font-medium', notifStatus.type === 'success' ? 'text-[var(--tone-positive)]' : 'text-destructive')}>
                      {notifStatus.message}
                    </p>
                  )}

                  <Button type="submit">
                    Save notifications
                  </Button>
                </CardContent>
              </Card>
            </form>
          </div>
        )}

        {/* D) COMPETITORS SECTION */}
        {activeTab === 'competitors' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1 text-foreground">Competitors list</h2>
              <p className="text-sm text-muted-foreground">Manage tracked websites, enable/disable scanning, or add new competitors.</p>
            </div>

            {/* Quick List */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tracked competitors</CardTitle>
              </CardHeader>

              {competitors.length === 0 ? (
                <CardContent className="pt-6 pb-6">
                  <p className="text-sm text-muted-foreground text-center">
                    No competitors added yet. Use the form below to add one.
                  </p>
                </CardContent>
              ) : (
                <div className="divide-y divide-border">
                  {competitors.map((comp) => {
                    const cleanUrl = comp.url.replace(/https?:\/\/(www\.)?/, '');
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanUrl}&sz=32`;

                    return (
                      <div key={comp.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={faviconUrl}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/favicon.ico';
                            }}
                            className="w-7 h-7 rounded-lg border border-border bg-muted p-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">
                              {comp.name || comp.url}
                            </p>
                            <p className="text-xs truncate text-muted-foreground">{comp.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Enable/Disable Toggle */}
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`toggle-${comp.id}`}
                              checked={comp.active}
                              onCheckedChange={() => handleToggleCompetitor(comp)}
                            />
                            <Label htmlFor={`toggle-${comp.id}`} className="text-xs text-muted-foreground cursor-pointer min-w-[48px]">
                              {comp.active ? 'Active' : 'Paused'}
                            </Label>
                          </div>

                          {/* Delete Button — AlertDialog confirmation */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove competitor?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will stop tracking <strong>{comp.name || comp.url}</strong> and delete all associated scan history. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => handleDeleteCompetitor(comp.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Add Competitor Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={16} />
                  Add new competitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCompetitor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-name">Competitor Name (optional)</Label>
                      <Input
                        id="new-name"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-url">Competitor Website (URL)</Label>
                      <Input
                        id="new-url"
                        type="text"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="e.g. acme.com"
                      />
                    </div>
                  </div>

                  {addStatus.type && (
                    <p className={clsx('text-xs font-medium', addStatus.type === 'success' ? 'text-[var(--tone-positive)]' : 'text-destructive')}>
                      {addStatus.message}
                    </p>
                  )}

                  <Button type="submit" disabled={isAdding}>
                    {isAdding ? 'Adding…' : 'Add competitor'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* E) BILLING & PLAN SECTION */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1 text-foreground">Subscription & billing</h2>
              <p className="text-sm text-muted-foreground">Manage payment details, upgrade your account, or download invoices.</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">Rivalscope Pro</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-foreground">
                        $49<span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </span>
                      <Badge variant={statusCfg.variant}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>

                  {settings.trial_ends_at && (
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide mb-1 text-muted-foreground">
                        Trial ends
                      </p>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {mounted ? new Date(settings.trial_ends_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Plan Features */}
                <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Included in Pro plan:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {[
                      "Track up to 7 competitors",
                      "Weekly intelligence digest",
                      "AI-generated talking points",
                      "12-week historical trends",
                      "Priority email support"
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={14} className="flex-shrink-0 text-[var(--tone-positive)]" />
                        <span className="text-sm text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {portalUrl && (
                  <Button asChild>
                    <a href={portalUrl}>
                      Manage billing
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                )}

                {checkoutUrl && (
                  <Button asChild>
                    <a href={checkoutUrl}>
                      Upgrade to Pro
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
