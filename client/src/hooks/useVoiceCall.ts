import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';

export type CallState = 'idle' | 'ringing-outgoing' | 'ringing-incoming' | 'connecting' | 'in-call';

// Voice-only WebRTC call manager. Uses only a public STUN server (no TURN), so calls may fail
// on restrictive/symmetric-NAT networks (corporate Wi-Fi, some mobile carriers) -- documented limitation.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useVoiceCall(threadId: string, localUserId: string | undefined) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteUserIdRef.current = null;
    setRemoteUserId(null);
    setCallState('idle');
    setIsMuted(false);
  }, []);

  const createPeerConnection = useCallback((toUserId: string) => {
    const socket = getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { threadId, toUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('in-call');
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup, threadId]);

  const startCall = useCallback(
    async (toUserId: string) => {
      setErrorMessage(null);
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        remoteUserIdRef.current = toUserId;
        setRemoteUserId(toUserId);
        setCallState('ringing-outgoing');
        getSocket().emit('call:invite', { threadId, toUserId });
      } catch {
        setErrorMessage('Microphone access is required to make a call');
      }
    },
    [threadId],
  );

  const acceptCall = useCallback(async () => {
    const toUserId = remoteUserIdRef.current;
    if (!toUserId) return;
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCallState('connecting');
      getSocket().emit('call:accept', { threadId, toUserId });
    } catch {
      setErrorMessage('Microphone access is required to answer a call');
    }
  }, [threadId]);

  const rejectCall = useCallback(() => {
    const toUserId = remoteUserIdRef.current;
    if (toUserId) getSocket().emit('call:reject', { threadId, toUserId });
    cleanup();
  }, [threadId, cleanup]);

  const endCall = useCallback(() => {
    const toUserId = remoteUserIdRef.current;
    if (toUserId) getSocket().emit('call:end', { threadId, toUserId });
    cleanup();
  }, [threadId, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    const socket = getSocket();

    const onIncoming = (payload: { threadId: string; fromUserId: string }) => {
      if (payload.threadId !== threadId) return;
      remoteUserIdRef.current = payload.fromUserId;
      setRemoteUserId(payload.fromUserId);
      setCallState('ringing-incoming');
    };

    const onAccepted = async (payload: { threadId: string; fromUserId: string }) => {
      if (payload.threadId !== threadId || !localUserId) return;
      const pc = createPeerConnection(payload.fromUserId);
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { threadId, toUserId: payload.fromUserId, sdp: offer });
      setCallState('connecting');
    };

    const onOffer = async (payload: { threadId: string; fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.threadId !== threadId) return;
      const pc = pcRef.current ?? createPeerConnection(payload.fromUserId);
      localStreamRef.current?.getTracks().forEach((track) => {
        if (!pc.getSenders().some((s) => s.track === track)) pc.addTrack(track, localStreamRef.current!);
      });
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { threadId, toUserId: payload.fromUserId, sdp: answer });
    };

    const onAnswer = async (payload: { threadId: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.threadId !== threadId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    };

    const onIceCandidate = async (payload: { threadId: string; candidate: RTCIceCandidateInit }) => {
      if (payload.threadId !== threadId || !pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        // Ignore late/duplicate candidates.
      }
    };

    const onRejected = (payload: { threadId: string }) => {
      if (payload.threadId !== threadId) return;
      setErrorMessage('The other person declined the call');
      cleanup();
    };

    const onEnd = (payload: { threadId: string }) => {
      if (payload.threadId !== threadId) return;
      cleanup();
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:rejected', onRejected);
    socket.on('call:end', onEnd);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:rejected', onRejected);
      socket.off('call:end', onEnd);
    };
  }, [threadId, localUserId, createPeerConnection, cleanup]);

  return {
    callState,
    isMuted,
    remoteUserId,
    errorMessage,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
