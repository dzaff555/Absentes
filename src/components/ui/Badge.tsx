import React from 'react';
import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'primary' | 'neutral';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-600/10',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60 ring-rose-600/10',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60 ring-amber-600/10',
    primary: 'bg-blue-50 text-blue-700 border-blue-200/60 ring-blue-600/10',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/10',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    primary: 'bg-blue-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-xs transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
