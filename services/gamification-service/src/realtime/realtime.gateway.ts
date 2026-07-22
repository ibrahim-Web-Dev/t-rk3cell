import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@campaigncell/auth-kit';

/**
 * Bonus: real-time badge/point notifications (case doc section 6.4:
 * "Rozet kazanıldığı anda kişiye görsel bildirim gösterilmelidir"). Clients
 * connect anonymously over Socket.IO and then send a `join` event carrying
 * their already-issued JWT access token; the server verifies it locally
 * (same JWT_SECRET as every other service) before joining a room named after
 * the verified user id, so a client can never subscribe to another user's
 * notifications by guessing an id.
 */
// Custom path so the API Gateway can proxy WebSocket upgrades under the same
// /api/v1/game/** prefix as this service's REST routes (see gateway/src/main.ts,
// ws: true on the proxy). Socket.IO's default path is just "/socket.io".
@WebSocketGateway({ cors: { origin: '*' }, path: '/api/v1/game/socket.io' })
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() token: string): void {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      client.join(payload.sub);
      client.emit('joined', { userId: payload.sub });
    } catch {
      client.emit('join.error', { message: 'Geçersiz token' });
    }
  }

  notifyPointsUpdated(userId: string, totalPoints: number, delta: number, reason: string): void {
    this.server?.to(userId).emit('points.updated', { totalPoints, delta, reason });
  }

  notifyBadgeEarned(userId: string, badgeCode: string): void {
    this.server?.to(userId).emit('badge.earned', { badgeCode });
  }
}
