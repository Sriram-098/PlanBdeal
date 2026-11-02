import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, Ticket } from 'lucide-react';
import { Listing } from '../../types';
import { Badge } from '../ui/Badge';
import { formatPrice, formatDateTime } from '../../utils/format';

const FALLBACK_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect width="100%" height="100%" fill="#1b1f29"/><text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="18" text-anchor="middle">No Poster</text></svg>`,
  );

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      to={`/tickets/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-cine-border bg-cine-surface transition-transform hover:-translate-y-1 hover:border-cine-accent/60"
    >
      <div className="h-44 w-full overflow-hidden bg-cine-surface2">
        <img
          src={listing.posterUrl || FALLBACK_POSTER}
          alt={listing.movieTitle}
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_POSTER)}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-cine-text">{listing.movieTitle}</h3>
          <Badge tone="info">{listing.language}</Badge>
        </div>
        <p className="flex items-center gap-1 text-sm text-cine-muted">
          <MapPin className="h-3.5 w-3.5" /> {listing.theatreName}, {listing.city}
        </p>
        <p className="flex items-center gap-1 text-sm text-cine-muted">
          <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(listing.showDateTime)}
        </p>
        <p className="flex items-center gap-1 text-sm text-cine-muted">
          <Ticket className="h-3.5 w-3.5" /> {listing.availableQuantity} of {listing.totalQuantity} available
        </p>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-semibold text-white">{formatPrice(listing.askingPricePerTicket)}</span>
          {Number(listing.askingPricePerTicket) < Number(listing.originalPricePerTicket) && (
            <span className="text-sm text-cine-muted line-through">{formatPrice(listing.originalPricePerTicket)}</span>
          )}
          <span className="text-xs text-cine-muted">/ ticket</span>
        </div>
      </div>
    </Link>
  );
}
