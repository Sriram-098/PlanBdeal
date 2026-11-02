import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Listing } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { formatDateTime, formatPrice } from '../../utils/format';

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  SOLD: 'neutral',
  CANCELLED: 'danger',
  EXPIRED: 'warning',
};

export function ListingsTab() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const { show } = useToast();

  const load = () => api.get('/users/me/listings').then((res) => setListings(res.data.listings));

  useEffect(() => {
    load();
  }, []);

  const cancelListing = async (id: string) => {
    try {
      await api.post(`/listings/${id}/cancel`);
      show('Listing cancelled', 'success');
      load();
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const markSold = async (id: string) => {
    try {
      await api.post(`/listings/${id}/sold`);
      show('Listing marked as sold', 'success');
      load();
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  if (!listings) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        title="You haven't listed any tickets yet"
        description="List a ticket you can no longer use to find a buyer."
        action={
          <Link to="/listings/new">
            <Button className="mt-2">List a Ticket</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <Card key={listing.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link to={`/tickets/${listing.id}`} className="font-medium text-white hover:underline">
                {listing.movieTitle}
              </Link>
              <Badge tone={statusTone[listing.status] ?? 'neutral'}>{listing.status}</Badge>
            </div>
            <p className="text-sm text-cine-muted">
              {listing.theatreName}, {listing.city} · {formatDateTime(listing.showDateTime)}
            </p>
            <p className="text-sm text-cine-muted">
              {listing.availableQuantity}/{listing.totalQuantity} available · {formatPrice(listing.askingPricePerTicket)} each
            </p>
          </div>
          {listing.status === 'ACTIVE' && (
            <div className="flex gap-2">
              <Link to={`/listings/${listing.id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
              <Button variant="secondary" onClick={() => markSold(listing.id)}>
                Mark Sold
              </Button>
              <Button variant="danger" onClick={() => cancelListing(listing.id)}>
                Cancel
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
