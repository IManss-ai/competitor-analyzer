'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type IconComponent = React.ComponentType<{ size?: number; weight?: string; className?: string }>;

interface Tab {
  title: string;
  icon: IconComponent;
  type?: never;
}

interface Separator {
  type: 'separator';
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: '.5rem',
    paddingRight: '.5rem',
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? '.5rem' : 0,
    paddingLeft: isSelected ? '1rem' : '.5rem',
    paddingRight: isSelected ? '1rem' : '.5rem',
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 'auto', opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: 'spring' as const, bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = 'text-white',
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    const newSelected = selected === index ? null : index;
    setSelected(newSelected);
    onChange?.(newSelected);
  };

  const isSeparator = (item: TabItem): item is Separator => item.type === 'separator';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.08] bg-[#080808] p-1',
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (isSeparator(tab)) {
          return (
            <div key={`separator-${index}`} className="mx-1 h-[24px] w-[1.2px] bg-white/[0.08]" />
          );
        }

        const IconComponent = tab.icon;
        const isSelected = selected === index;

        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={cn(
              'relative flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-300',
              isSelected
                ? cn('bg-white/[0.08]', activeColor)
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            )}
          >
            <IconComponent size={18} />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
