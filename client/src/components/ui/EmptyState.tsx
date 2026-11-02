import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cine-border bg-cine-surface/50 py-16 text-center">
      <Inbox className="h-10 w-10 text-cine-muted" />
      <p className="font-medium text-cine-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-cine-muted">{description}</p>}
      {action}
    </div>
  );
}
