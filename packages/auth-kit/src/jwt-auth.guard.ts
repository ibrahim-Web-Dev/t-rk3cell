import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from './jwt-payload.interface';

export const PUBLIC_ROUTE_KEY = 'isPublicRoute';

/**
 * Verifies the access token signature and expiry locally, using the shared
 * JWT_SECRET env var. Every service applies this guard globally so that a
 * request bypassing the API Gateway is still rejected (defense-in-depth) -
 * it is not enough to trust routing performed upstream.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublic) return true;
      throw new UnauthorizedException('Erişim tokeni bulunamadı');
    }

    const token = authHeader.slice('Bearer '.length);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET tanımlı değil');
    }

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      request.user = payload;
      return true;
    } catch (err) {
      if (isPublic) return true;
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
    }
  }
}
