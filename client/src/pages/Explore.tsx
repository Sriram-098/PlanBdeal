import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { api } from '../services/api';
import { Listing, Paginated } from '../types';
import { ListingCard } from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

export function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Paginated<Listing> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const movieTitle = searchParams.get('movieTitle') ?? '';
  const city = searchParams.get('city') ?? '';
  const theatreName = searchParams.get('theatreName') ?? '';
  const language = searchParams.get('language') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1');

  // Local draft values so every keystroke feels instant, synced to the URL (and the API call) after a short debounce.
  const [draft, setDraft] = useState({ movieTitle, city, theatreName, language, maxPrice });

  useEffect(() => {
    setDraft({ movieTitle, city, theatreName, language, maxPrice });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      (Object.entries(draft) as [keyof typeof draft, string][]).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      if (next.toString() !== searchParams.toString()) {
        next.set('page', '1');
        setSearchParams(next, { replace: true });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, string> = { sort, page: String(page), pageSize: '12' };
    if (movieTitle) params.movieTitle = movieTitle;
    if (city) params.city = city;
    if (theatreName) params.theatreName = theatreName;
    if (language) params.language = language;
    if (maxPrice) params.maxPrice = maxPrice;

    api
      .get<Paginated<Listing>>('/listings', { params })
      .then((res) => setData(res.data))
      .finally(() => setIsLoading(false));
  }, [movieTitle, city, theatreName, language, maxPrice, sort, page]);

  const updateDraft = (key: keyof typeof draft, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setDraft({ movieTitle: '', city: '', theatreName: '', language: '', maxPrice: '' });
    setSearchParams({});
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Explore Tickets</h1>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-cine-border bg-cine-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input placeholder="Movie" value={draft.movieTitle} onChange={(e) => updateDraft('movieTitle', e.target.value)} />
        <Input placeholder="City" value={draft.city} onChange={(e) => updateDraft('city', e.target.value)} />
        <Input placeholder="Theatre" value={draft.theatreName} onChange={(e) => updateDraft('theatreName', e.target.value)} />
        <Input placeholder="Language" value={draft.language} onChange={(e) => updateDraft('language', e.target.value)} />
        <Input
          type="number"
          placeholder="Max price"
          value={draft.maxPrice}
          onChange={(e) => updateDraft('maxPrice', e.target.value)}
        />
        <Select value={sort} onChange={(e) => updateParam('sort', e.target.value)} className="lg:col-span-2">
          <option value="newest">Sort: Newest</option>
          <option value="price_asc">Sort: Lowest price</option>
        </Select>
        <Button variant="secondary" onClick={clearFilters} className="lg:col-span-1">
          <X className="h-4 w-4" /> Clear filters
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No tickets match your filters"
          description="Try widening your search or check back later for new listings."
          action={
            <Button variant="secondary" onClick={clearFilters} className="mt-2">
              <Filter className="h-4 w-4" /> Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-cine-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
