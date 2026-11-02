import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, CalendarDays, Ticket, Languages, ShieldCheck, MessageSquarePlus, Pencil } from 'lucide-react';
import { api, getErrorMessage } from '../services/api';
import { Listing } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { formatPrice, formatDateTime } from '../utils/format';

const FALLBACK_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="100%" height="100%" fill="#1b1f29"/><text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="20" text-anchor="middle">No Poster</text></svg>`,
  );

const TRANSFER_METHOD_LABEL: Record<string, string> = {
  PROVIDER_APP_TRANSFER: "Transfer via the provider's app",
  EDIT_NAME_ON_BOOKING: 'Edit attendee name on booking',
  EMAIL_TRANSFER: 'Email-based transfer',
  OTHER: 'Other permitted method',
};

export function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`).then((res) => setListing(res.data.listing));
  }, [id]);

  if (!listing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const isOwnListing = user?.id === listing.sellerId;
  const isExpired = new Date(listing.showDateTime).getTime() <= Date.now();
  const canRequest = listing.status === 'ACTIVE' && !isExpired && !isOwnListing;

  const openRequestModal = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/tickets/${listing.id}` } } });
      return;
    }
    setModalOpen(true);
  };

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      await api.post(`/listings/${listing.id}/requests`, { quantity, message });
      show('Request sent to the seller', 'success');
      setModalOpen(false);
      navigate('/dashboard?tab=requests');
    } catch (err) {
      show(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[320px_1fr]">
        <img
          src={listing.posterUrl || FALLBACK_POSTER}
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_POSTER)}
          alt={listing.movieTitle}
          className="h-96 w-full rounded-xl border border-cine-border object-cover"
        />
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{listing.movieTitle}</h1>
            <Badge tone="info">{listing.language}</Badge>
            {listing.status !== 'ACTIVE' && <Badge tone="warning">{listing.status}</Badge>}
          </div>
          <div className="space-y-2 text-sm text-cine-muted">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {listing.theatreName}, {listing.city}{listing.theatreLocation ? ` — ${listing.theatreLocation}` : ''}</p>
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {formatDateTime(listing.showDateTime)} ({listing.showtimeLabel})</p>
            <p className="flex items-center gap-2"><Ticket className="h-4 w-4" /> {listing.availableQuantity} of {listing.totalQuantity} tickets available</p>
            <p className="flex items-center gap-2"><Languages className="h-4 w-4" /> Provider: {listing.provider}</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Transfer method: {TRANSFER_METHOD_LABEL[listing.transferMethod]}</p>
            {listing.seatInfo && <p>Seats: {listing.seatInfo}</p>}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">{formatPrice(listing.askingPricePerTicket)}</span>
            {Number(listing.askingPricePerTicket) !== Number(listing.originalPricePerTicket) && (
              <span className="text-base text-cine-muted line-through">{formatPrice(listing.originalPricePerTicket)}</span>
            )}
            <span className="text-sm text-cine-muted">per ticket</span>
          </div>

          {listing.description && <p className="mt-4 text-sm text-cine-text">{listing.description}</p>}

          {listing.seller && (
            <p className="mt-4 text-sm text-cine-muted">Listed by {listing.seller.fullName}</p>
          )}

          <div className="mt-6">
            {isOwnListing ? (
              <div className="flex items-center gap-3">
                <Badge tone="neutral">This is your listing</Badge>
                {listing.status === 'ACTIVE' && (
                  <Button variant="secondary" onClick={() => navigate(`/listings/${listing.id}/edit`)}>
                    <Pencil className="h-4 w-4" /> Edit Listing
                  </Button>
                )}
              </div>
            ) : !canRequest ? (
              <Badge tone="danger">This listing is no longer available</Badge>
            ) : (
              <Button onClick={openRequestModal}>
                <MessageSquarePlus className="h-4 w-4" /> Request Ticket
              </Button>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-amber-800 bg-amber-900/20 p-4 text-xs text-amber-200">
            Payments are not processed by PlanBDeal in this demo. Only complete transactions through a permitted and
            supported transfer process.
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request this ticket">
        <div className="space-y-4">
          <Input
            type="number"
            min={1}
            max={listing.availableQuantity}
            label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Textarea
            label="Message to seller (optional)"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi, is this ticket still available?"
          />
          <Button className="w-full" isLoading={submitting} onClick={submitRequest}>
            Send Request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
