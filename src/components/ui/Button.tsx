import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'terminal';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98]";
    
    const variants = {
      default: "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25",
      secondary: "bg-white/[0.06] hover:bg-white/[0.1] text-slate-100 border border-white/[0.08] shadow-sm",
      outline: "border border-white/[0.1] hover:bg-white/[0.08] text-slate-200 hover:border-white/20",
      ghost: "hover:bg-white/[0.06] text-slate-300 hover:text-white",
      destructive: "bg-rose-600/90 hover:bg-rose-500 text-white shadow-sm",
      terminal: "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/50"
    };

    const sizes = {
      sm: "h-7 px-2.5 text-xs rounded-xl gap-1.5",
      md: "h-9 px-3.5 text-xs rounded-xl gap-2",
      lg: "h-11 px-5 text-sm rounded-xl gap-2.5",
      icon: "h-8 w-8 rounded-xl text-xs"
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
