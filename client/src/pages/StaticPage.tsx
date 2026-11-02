import { ReactNode } from 'react';

export function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-bold text-white">{title}</h1>
      <div className="space-y-3 text-sm leading-relaxed text-cine-muted">{children}</div>
    </div>
  );
}
