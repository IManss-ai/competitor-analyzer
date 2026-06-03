"use client";

import { useState } from "react";
import { Save, Key, Bell, Globe, Copy, CheckCheck } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ company_name: "Acme AI", company_slug: "acme-ai", logo_url: "" });
  const [notifications, setNotifications] = useState({ compliance_alerts: true, weekly_report: true, disclosure_published: true });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = `https://tdcr.vercel.app/p/${profile.company_slug}`;
  const apiKey = "tdcr_sk_live_••••••••••••••••";

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyUrl() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Company Profile */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-indigo-400" />
          <h3 className="text-white font-semibold">Company Profile</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-slate-300 text-sm mb-1.5 block">Company Name</label>
            <input
              value={profile.company_name}
              onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-slate-300 text-sm mb-1.5 block">Company Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">tdcr.vercel.app/p/</span>
              <input
                value={profile.company_slug}
                onChange={(e) => setProfile({ ...profile, company_slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <p className="text-slate-600 text-xs mt-1.5">Your public disclosure URL will be: <span className="text-indigo-400">{publicUrl}</span></p>
          </div>
        </div>
      </section>

      {/* Public URL */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white font-semibold">Public Disclosure Page</h3>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5">
          <span className="flex-1 text-slate-300 text-sm font-mono truncate">{publicUrl}</span>
          <button onClick={copyUrl} className="text-slate-400 hover:text-indigo-400 transition-colors flex-shrink-0">
            {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-2">Share this URL to make your AB 2013 disclosure publicly accessible.</p>
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-semibold">Notifications</h3>
        </div>
        <div className="space-y-4">
          {[
            { key: "compliance_alerts" as const, label: "Compliance Alerts", desc: "Notify when datasets have missing required fields" },
            { key: "weekly_report" as const, label: "Weekly Report", desc: "Receive a weekly compliance summary email" },
            { key: "disclosure_published" as const, label: "Disclosure Published", desc: "Notify when a public disclosure is generated" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
              <button
                onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
                className={`w-10 h-5 rounded-full transition-all relative ${notifications[key] ? "bg-indigo-600" : "bg-slate-700"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${notifications[key] ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* API Keys */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-violet-400" />
          <h3 className="text-white font-semibold">API Key</h3>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 mb-3">
          <span className="flex-1 text-slate-300 text-sm font-mono">{apiKey}</span>
          <button className="text-slate-400 hover:text-indigo-400 transition-colors">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <button className="text-rose-400 hover:text-rose-300 text-xs transition-colors">Regenerate key</button>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all"
      >
        {saved ? <CheckCheck className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </div>
  );
}
