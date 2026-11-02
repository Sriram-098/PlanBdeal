import { useSearchParams } from 'react-router-dom';
import { ListingsTab } from '../components/dashboard/ListingsTab';
import { RequestsTab } from '../components/dashboard/RequestsTab';
import { ChatsTab } from '../components/dashboard/ChatsTab';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { formatDateTime } from '../utils/format';

const TABS = [
  { key: 'listings', label: 'My Listings' },
  { key: 'requests', label: 'My Requests' },
  { key: 'chats', label: 'My Chats' },
  { key: 'profile', label: 'Profile' },
] as const;

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const tab = searchParams.get('tab') ?? 'listings';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">My Activity</h1>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-cine-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams({ tab: t.key })}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-cine-surface2 text-white' : 'text-cine-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'listings' && <ListingsTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'chats' && <ChatsTab />}
      {tab === 'profile' && user && (
        <Card className="max-w-md p-6">
          <p className="text-sm text-cine-muted">Full name</p>
          <p className="mb-3 font-medium text-white">{user.fullName}</p>
          <p className="text-sm text-cine-muted">Email</p>
          <p className="mb-3 font-medium text-white">{user.email}</p>
          <p className="text-sm text-cine-muted">Member since</p>
          <p className="font-medium text-white">{formatDateTime(user.createdAt)}</p>
        </Card>
      )}
    </div>
  );
}
