'use client';

import { cn } from '@/lib/utils';
import { Sparkle } from '@phosphor-icons/react';

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkle />,
  title = "Update",
  description = "Something changed",
  date = "just now",
  iconClassName = "bg-blue-800",
  titleClassName = "text-blue-400",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] select-none flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 transition-all duration-300 hover:border-white/20 hover:-translate-y-1",
        className
      )}
    >
      <div
        className="absolute inset-0 rounded-xl bg-[#080808]/60 bg-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top left, rgba(59,130,246,0.08), transparent 60%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-white/80",
            iconClassName
          )}
        >
          {icon}
        </span>
        <p className={cn("font-semibold text-sm", titleClassName)}>{title}</p>
      </div>
      <div className="relative">
        <p className="text-xs text-white/60 leading-snug">{description}</p>
        <p className="mt-1 text-[11px] text-white/30 font-mono">{date}</p>
      </div>
    </div>
  );
}

interface CardData {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
}

interface DisplayCardsProps {
  cards?: CardData[];
}

const defaultCards: CardData[] = [
  {
    icon: <Sparkle weight="fill" />,
    title: "Pricing change",
    description: "Stripe removed enterprise tier",
    date: "2h ago",
  },
  {
    icon: <Sparkle weight="fill" />,
    title: "New feature",
    description: "Competitor launched SDK v4",
    date: "1d ago",
  },
  {
    icon: <Sparkle weight="fill" />,
    title: "Strategic signal",
    description: "4 new sales hires in EMEA",
    date: "3d ago",
  },
];

export default function DisplayCards({ cards = defaultCards }: DisplayCardsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-center py-8 w-full max-w-5xl mx-auto">
      {cards.map((card, i) => {
        // Exclude parent classNames that have positioning transforms
        return (
          <DisplayCard
            key={i}
            {...card}
            className="w-full md:w-[22rem] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 shadow-lg"
          />
        );
      })}
    </div>
  );
}
