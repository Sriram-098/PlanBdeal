import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { ConnectRequest } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { formatDateTime } from '../../utils/format';

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

export function RequestsTab() {
  const [subTab, setSubTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<ConnectRequest[] | null>(null);
  const [sent, setSent] = useState<ConnectRequest[] | null>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  const loadReceived = () => api.get('/users/me/received-requests').then((res) => setReceived(res.data.requests));
  const loadSent = () => api.get('/users/me/requests').then((res) => setSent(res.data.requests));

  useEffect(() => {
    loadReceived();
    loadSent();
  }, []);

  const accept = async (id: string) => {
    try {
      const res = await api.post(`/requests/${id}/accept`);
      show('Request accepted — chat unlocked', 'success');
      loadReceived();
      navigate(`/chat/${res.data.chatThread.id}`);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const reject = async (id: string) => {
    try {
      await api.post(`/requests/${id}/reject`);
      show('Request rejected', 'info');
      loadReceived();
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const withdraw = async (id: string) => {
    try {
      await api.post(`/requests/${id}/withdraw`);
      show('Request withdrawn', 'info');
      loadSent();
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  const list = subTab === 'received' ? received : sent;

  // Only the one active (oldest-pending) request per listing is shown as an actionable card on the
  // "Received" tab — everyone else waiting behind it is redacted server-side and just counted here.
  const queuedCountByListing = new Map<string, number>();
  if (subTab === 'received') {
    for (const req of received ?? []) {
      if (req.status === 'PENDING' && !req.isActive) {
        queuedCountByListing.set(req.listingId, (queuedCountByListing.get(req.listingId) ?? 0) + 1);
      }
    }
  }
  const visibleList =
    subTab === 'received' ? (list ?? []).filter((req) => !(req.status === 'PENDING' && !req.isActive)) : list;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button variant={subTab === 'received' ? 'primary' : 'secondary'} onClick={() => setSubTab('received')}>
          Received
        </Button>
        <Button variant={subTab === 'sent' ? 'primary' : 'secondary'} onClick={() => setSubTab('sent')}>
          Sent
        </Button>
      </div>

      {!list ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={subTab === 'received' ? 'No requests received yet' : 'You haven\u2019t requested any tickets yet'} />
      ) : (
        <div className="space-y-3">
          {visibleList?.map((req) => (
            <Card key={req.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/tickets/${req.listingId}`} className="font-medium text-white hover:underline">
                    {req.listing?.movieTitle}
                  </Link>
                  <Badge tone={statusTone[req.status]}>{req.status}</Badge>
                </div>
                <p className="text-sm text-cine-muted">
                  {req.quantity} ticket(s) {subTab === 'received' ? `requested by ${req.buyer?.fullName}` : ''} ·{' '}
                  {req.listing && formatDateTime(req.listing.showDateTime)}
                </p>
                {req.message && <p className="mt-1 text-sm text-cine-text">&ldquo;{req.message}&rdquo;</p>}
                {subTab === 'received' && req.status === 'PENDING' && (queuedCountByListing.get(req.listingId) ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-cine-muted">
                    +{queuedCountByListing.get(req.listingId)} other buyer(s) waiting — they'll be notified if this
                    ticket is sold.
                  </p>
                )}
                {subTab === 'sent' && req.status === 'PENDING' && !req.isActive && (
                  <p className="mt-1 text-xs text-cine-muted">
                    You're #{req.queuePosition} in line — waiting for the buyer(s) ahead of you to be handled first.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {subTab === 'received' && req.status === 'PENDING' && (
                  <>
                    <Button onClick={() => accept(req.id)}>Accept</Button>
                    <Button variant="danger" onClick={() => reject(req.id)}>
                      Reject
                    </Button>
                  </>
                )}
                {subTab === 'sent' && req.status === 'PENDING' && (
                  <Button variant="secondary" onClick={() => withdraw(req.id)}>
                    Withdraw
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
