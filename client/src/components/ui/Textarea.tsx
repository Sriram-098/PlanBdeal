import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, id, className = '', ...props }, ref) => {
  const areaId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-cine-muted">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        ref={ref}
        className={`rounded-xl border border-cine-border bg-cine-surface2 px-3 py-2 text-sm text-cine-text placeholder:text-cine-muted focus:border-cine-accent focus:outline-none focus:ring-1 focus:ring-cine-accent ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
