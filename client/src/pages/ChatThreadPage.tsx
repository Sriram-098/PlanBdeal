import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Phone, PhoneOff, Mic, MicOff, PhoneCall } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { useVoiceCall } from '../hooks/useVoiceCall';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ChatThread, Message } from '../types';

export function ChatThreadPage() {
  const { id: threadId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { show } = useToast();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherUser = thread ? (thread.buyerId === user?.id ? thread.seller : thread.buyer) : null;
  const call = useVoiceCall(threadId ?? '', user?.id);

  useEffect(() => {
    if (!threadId) return;
    api.get(`/chats/${threadId}`).then((res) => setThread(res.data.thread));
    api.get(`/chats/${threadId}/messages`).then((res) => setMessages(res.data.messages));

    const socket = getSocket();
    socket.emit('chat:join', threadId);

    const onNewMessage = (message: Message) => {
      if (message.chatThreadId === threadId) setMessages((prev) => [...prev, message]);
    };
    socket.on('message:new', onNewMessage);
    return () => {
      socket.off('message:new', onNewMessage);
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (call.errorMessage) show(call.errorMessage, 'error');
  }, [call.errorMessage, show]);

  const sendMessage = () => {
    if (!input.trim() || !threadId) return;
    getSocket().emit('message:send', { threadId, content: input.trim() });
    setInput('');
  };

  if (!thread) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between rounded-xl border border-cine-border bg-cine-surface p-3">
        <div>
          <p className="font-medium text-white">{otherUser?.fullName}</p>
          <p className="text-xs text-cine-muted">{thread.listing?.movieTitle}</p>
        </div>
        {call.callState === 'idle' && otherUser && (
          <Button variant="secondary" onClick={() => call.startCall(otherUser.id)}>
            <Phone className="h-4 w-4" /> Call
          </Button>
        )}
      </div>

      {call.callState !== 'idle' && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-cine-accent/50 bg-cine-surface2 p-3">
          <p className="text-sm text-cine-text">
            {call.callState === 'ringing-outgoing' && `Calling ${otherUser?.fullName}...`}
            {call.callState === 'ringing-incoming' && `${otherUser?.fullName} is calling...`}
            {call.callState === 'connecting' && 'Connecting...'}
            {call.callState === 'in-call' && `In call with ${otherUser?.fullName}`}
          </p>
          <div className="flex gap-2">
            {call.callState === 'ringing-incoming' && (
              <>
                <Button onClick={call.acceptCall}>
                  <PhoneCall className="h-4 w-4" /> Accept
                </Button>
                <Button variant="danger" onClick={call.rejectCall}>
                  <PhoneOff className="h-4 w-4" /> Decline
                </Button>
              </>
            )}
            {['ringing-outgoing', 'connecting', 'in-call'].includes(call.callState) && (
              <>
                {call.callState === 'in-call' && (
                  <Button variant="secondary" onClick={call.toggleMute}>
                    {call.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                <Button variant="danger" onClick={call.endCall}>
                  <PhoneOff className="h-4 w-4" /> End
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      <audio ref={call.remoteAudioRef} autoPlay />

      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-cine-border bg-cine-surface p-4">
        {messages.length === 0 && <p className="text-center text-sm text-cine-muted">Say hello to get started.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                m.senderId === user?.id ? 'bg-cine-accent text-white' : 'bg-cine-surface2 text-cine-text'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message"
          className="flex-1 rounded-xl border border-cine-border bg-cine-surface2 px-3 py-2 text-sm text-cine-text placeholder:text-cine-muted focus:border-cine-accent focus:outline-none"
        />
        <Button onClick={sendMessage}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
