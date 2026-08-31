import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ticker' | 'outline' | 'success' | 'live' | 'secondary';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const base = "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-wide rounded-md transition-colors font-mono select-none";

  const variants = {
    default: "bg-slate-800 text-slate-200 border border-slate-700/60",
    ticker: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    outline: "text-slate-400 border border-slate-700/80 bg-transparent",
    success: "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80",
    live: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    secondary: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
  };

  return (
    <div className={cn(base, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};
