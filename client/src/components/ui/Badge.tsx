import { HTMLAttributes } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-cine-surface2 text-cine-muted border-cine-border',
  success: 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
  warning: 'bg-amber-900/30 text-amber-300 border-amber-800',
  danger: 'bg-red-900/30 text-red-300 border-red-800',
  info: 'bg-violet-900/30 text-violet-300 border-violet-800',
};

export function Badge({ tone = 'neutral', className = '', children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
