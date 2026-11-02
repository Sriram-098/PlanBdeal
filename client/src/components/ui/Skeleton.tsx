export function ListingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-cine-border bg-cine-surface p-4">
      <div className="mb-3 h-40 w-full rounded-lg bg-cine-surface2" />
      <div className="mb-2 h-4 w-3/4 rounded bg-cine-surface2" />
      <div className="mb-2 h-3 w-1/2 rounded bg-cine-surface2" />
      <div className="h-3 w-1/3 rounded bg-cine-surface2" />
    </div>
  );
}
