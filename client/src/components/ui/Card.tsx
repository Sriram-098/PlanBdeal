import { HTMLAttributes } from 'react';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-cine-border bg-cine-surface shadow-sm shadow-black/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
