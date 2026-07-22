import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../auth/authStore';

export interface RealtimeHandlers {
  onPointsUpdated?: (data: { totalPoints: number; delta: number; reason: string }) => void;
  onBadgeEarned?: (data: { badgeCode: string }) => void;
}

/**
 * Connects to Gamification Service's WebSocket gateway and joins the current
 * user's room by sending their access token (verified server-side - see
 * services/gamification-service/src/realtime/realtime.gateway.ts).
 */
export function useRealtime(handlers: RealtimeHandlers, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const token = getAccessToken();
    if (!token) return;

    const url = import.meta.env.VITE_GAMIFICATION_WS_URL ?? 'http://localhost:3000';
    const socket = io(url, { transports: ['websocket'], path: '/api/v1/game/socket.io' });

    socket.on('connect', () => socket.emit('join', token));
    if (handlers.onPointsUpdated) socket.on('points.updated', handlers.onPointsUpdated);
    if (handlers.onBadgeEarned) socket.on('badge.earned', handlers.onBadgeEarned);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
