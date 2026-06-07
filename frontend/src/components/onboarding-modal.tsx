'use client';

import { useState, useEffect } from 'react';
import { Laptop, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BusinessType } from '@/lib/types';

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('business_type');
    if (!stored) {
      setTimeout(() => setVisible(true), 0);
    }
  }, []);

  const handleSelect = async (type: BusinessType) => {
    setSelected(type);
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const userId = localStorage.getItem('user_id') || '';
      await fetch(`${apiUrl}/api/v1/onboarding/business-type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ business_type: type }),
      });
    } catch {
      // Non-fatal — still persist locally
    }
    localStorage.setItem('business_type', type);
    setSaving(false);
    setVisible(false);
  };

  if (!visible) return null;

  const options: {
    type: BusinessType;
    icon: typeof Laptop;
    title: string;
    description: string;
  }[] = [
    {
      type: 'saas',
      icon: Laptop,
      title: 'SaaS Startup',
      description: 'Track competitor websites, pricing pages, and product updates',
    },
    {
      type: 'local',
      icon: Store,
      title: 'Local Business',
      description: 'Track nearby competitors on Google Maps, Instagram, and Facebook',
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 rounded-xl shadow-2xl p-8 md:p-10 max-w-xl w-full mx-4 border border-white/5"
            style={{ backgroundColor: 'var(--surface-overlay)' }}
          >
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                How do you use this?
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Choose your business type to personalize your experience
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selected === opt.type;

                return (
                  <motion.button
                    key={opt.type}
                    onClick={() => handleSelect(opt.type)}
                    disabled={saving}
                    whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative p-6 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60`}
                    style={{
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-default)',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon size={24}  />
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {opt.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {opt.description}
                    </p>

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          className="text-white"
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {saving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 text-center"
              >
                <p className="text-xs font-medium font-mono" style={{ color: 'var(--text-muted)' }}>
                  Setting up your workspace...
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
