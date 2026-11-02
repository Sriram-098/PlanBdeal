import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, id, className = '', children, ...props }, ref) => {
  const selectId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-cine-muted">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`rounded-xl border border-cine-border bg-cine-surface2 px-3 py-2 text-sm text-cine-text focus:border-cine-accent focus:outline-none focus:ring-1 focus:ring-cine-accent ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
