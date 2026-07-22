import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './app.module';
import { isPublicPath } from './public-paths';
import { buildRoutingTable } from './routing-table';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const httpAdapter = app.getHttpAdapter().getInstance();

  // Enabled explicitly and FIRST (rather than via `NestFactory.create(_, {cors:true})`,
  // which Nest defers until app.init()/listen() - by then every app.use()
  // below would already be registered ahead of it in the Express middleware
  // stack, so an OPTIONS preflight would hit the JWT check first and get
  // rejected with no CORS headers, which is exactly the bug this avoids).
  app.enableCors();

  // Health check - exempt from rate limiting/auth, registered first so it
  // short-circuits before any of the middleware below runs.
  httpAdapter.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

  // Global rate limiting (case doc section 10: brute-force / rate limit testi).
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, data: null, error: { message: 'Çok fazla istek, lütfen bekleyin', statusCode: 429 } },
    }),
  );
  // Stricter limiter specifically on auth endpoints (login/OTP brute-force protection).
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 60_000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, data: null, error: { message: 'Çok fazla giriş denemesi, lütfen bekleyin', statusCode: 429 } },
    }),
  );

  // Fast-fail JWT check. This is NOT a substitute for each service's own
  // JwtAuthGuard/RolesGuard - it just rejects obviously missing/invalid
  // tokens before they even reach a backend service.
  app.use((req, res, next) => {
    if (isPublicPath(req.path)) return next();
    const header = req.headers['authorization'];
    if (!header || Array.isArray(header) || !header.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ success: false, data: null, error: { message: 'Erişim tokeni bulunamadı', statusCode: 401 } });
    }
    try {
      jwt.verify((header as string).slice('Bearer '.length), process.env.JWT_SECRET!);
      next();
    } catch {
      return res
        .status(401)
        .json({ success: false, data: null, error: { message: 'Geçersiz veya süresi dolmuş token', statusCode: 401 } });
    }
  });

  // Built once per prefix and dispatched manually (rather than via
  // `app.use(prefix, proxy)`) because Express strips the mount prefix from
  // `req.url` for path-mounted middleware, and http-proxy-middleware forwards
  // whatever `req.url` currently is - which would silently drop the
  // /api/v1/xxx prefix that every backend service (setGlobalPrefix) expects.
  const routingTable = buildRoutingTable();
  const proxiesByPrefix = new Map(
    Object.entries(routingTable).map(([prefix, target]) => [
      prefix,
      // ws: true lets the Gamification Service's Socket.IO gateway (real-time
      // badge/point notifications) upgrade through the same gateway prefix
      // instead of requiring the frontend to bypass the gateway.
      createProxyMiddleware({ target, changeOrigin: true, ws: true }),
    ]),
  );
  const sortedPrefixes = Object.keys(routingTable).sort((a, b) => b.length - a.length);

  app.use((req, res, next) => {
    const prefix = sortedPrefixes.find((p) => req.path === p || req.path.startsWith(`${p}/`));
    if (!prefix) return next();
    return proxiesByPrefix.get(prefix)!(req, res, next);
  });

  // WebSocket upgrade requests (Gamification Service's Socket.IO gateway)
  // never pass through Express's middleware stack - they're raw 'upgrade'
  // events on the underlying HTTP server - so they need their own dispatch.
  const httpServer = app.getHttpServer();
  httpServer.on('upgrade', (req: import('http').IncomingMessage, socket: import('net').Socket, head: Buffer) => {
    const url = req.url ?? '';
    const prefix = sortedPrefixes.find((p) => url === p || url.startsWith(`${p}/`));
    const proxy = prefix ? proxiesByPrefix.get(prefix) : undefined;
    const upgradeable = proxy as unknown as
      | { upgrade: (req: import('http').IncomingMessage, socket: import('net').Socket, head: Buffer) => void }
      | undefined;
    if (upgradeable?.upgrade) {
      upgradeable.upgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API Gateway listening on port ${port}`);
}
bootstrap();
