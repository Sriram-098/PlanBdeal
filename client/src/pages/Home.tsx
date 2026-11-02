import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ListChecks, MessageCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Listing, Paginated } from '../types';
import { ListingCard } from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Home() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<Listing[] | null>(null);
  const [movie, setMovie] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    api.get<Paginated<Listing>>('/listings', { params: { sort: 'newest', pageSize: 8 } }).then((res) => {
      setRecent(res.data.items);
    });
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (movie) params.set('movieTitle', movie);
    if (city) params.set('city', city);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <div>
      <section className="border-b border-cine-border bg-gradient-to-b from-cine-surface to-cine-bg">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-white md:text-5xl">
            Your plans changed. Your ticket doesn&apos;t have to go to waste.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-cine-muted">
            Discover unused movie tickets, connect with fellow moviegoers, and find a show that works for you.
          </p>

          <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-xl border border-cine-border bg-cine-surface p-3 sm:flex-row">
            <Input placeholder="Movie name" value={movie} onChange={(e) => setMovie(e.target.value)} className="flex-1" />
            <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="flex-1" />
            <Button type="submit">
              <Search className="h-4 w-4" /> Search
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Recently listed tickets</h2>
          <Link to="/explore" className="text-sm text-cine-accent hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recent === null
            ? Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)
            : recent.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      </section>

      <section className="border-y border-cine-border bg-cine-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-center text-xl font-semibold text-white">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-cine-border bg-cine-surface p-6 text-center">
              <ListChecks className="mx-auto mb-3 h-8 w-8 text-cine-accent" />
              <p className="font-medium text-white">List your ticket</p>
              <p className="mt-1 text-sm text-cine-muted">Share the details of a ticket you can no longer use.</p>
            </div>
            <div className="rounded-xl border border-cine-border bg-cine-surface p-6 text-center">
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-cine-accent" />
              <p className="font-medium text-white">Connect with a moviegoer</p>
              <p className="mt-1 text-sm text-cine-muted">Chat and voice call in-app once a request is accepted — no phone numbers shared.</p>
            </div>
            <div className="rounded-xl border border-cine-border bg-cine-surface p-6 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-cine-accent" />
              <p className="font-medium text-white">Transfer the permitted way</p>
              <p className="mt-1 text-sm text-cine-muted">Complete the handoff through your ticket provider's own supported transfer process.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-5 text-sm text-amber-200">
          <p className="font-medium">Safety &amp; responsible transfers</p>
          <p className="mt-1">
            PlanBDeal never processes payments and never claims that a screenshot, QR code, or PDF proves a valid
            ticket transfer. Only complete a transfer through your ticket provider's own permitted method.
          </p>
        </div>
      </section>
    </div>
  );
}
