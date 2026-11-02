import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { api } from '../../services/api';
import { ChatThread } from '../../types';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';

export function ChatsTab() {
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/chats').then((res) => setThreads(res.data.threads));
  }, []);

  if (!threads) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (threads.length === 0) {
    return <EmptyState title="No conversations yet" description="Chats unlock once a request is accepted." />;
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const otherUser = thread.buyerId === user?.id ? thread.seller : thread.buyer;
        const lastMessage = thread.messages?.[0];
        return (
          <Link key={thread.id} to={`/chat/${thread.id}`}>
            <Card className="flex items-center gap-3 p-4 hover:border-cine-accent/60">
              <MessageCircle className="h-5 w-5 text-cine-accent" />
              <div>
                <p className="font-medium text-white">
                  {thread.listing?.movieTitle} — with {otherUser?.fullName}
                </p>
                <p className="text-sm text-cine-muted">{lastMessage ? lastMessage.content : 'No messages yet'}</p>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
