import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuditLogEntryPayload, EventRoutingKey } from '@campaigncell/shared-types';
import { RabbitMqService } from '@campaigncell/event-bus';

/**
 * Single global exception filter used by every service:
 *  - Normalizes ALL errors (validation, business rule 422s, 404s, unexpected
 *    500s, 401/403) into the standard { success, data, error } envelope.
 *  - For 401/403 specifically, publishes `audit.log.entry` so Identity
 *    Service's centralized audit log captures unauthorized access attempts
 *    raised by any service, without any service touching Identity's DB.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(`Exceptions:${this.serviceName}`);

  constructor(private readonly rabbitMq: RabbitMqService, private readonly serviceName: string) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException ? extractMessage(exception as HttpException) : 'Beklenmeyen bir sunucu hatası oluştu';

    if (!isHttpException) {
      this.logger.error((exception as Error)?.stack ?? String(exception));
    }

    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      const user = request.user;
      const payload: AuditLogEntryPayload = {
        user_id: user?.sub ?? null,
        action: `${this.serviceName}:${request.method} ${request.originalUrl ?? request.url}`,
        ip: request.ip ?? request.headers?.['x-forwarded-for'] ?? null,
        result: 'FAILURE',
        detail: message,
      };
      this.rabbitMq.publish(EventRoutingKey.AUDIT_LOG_ENTRY, payload).catch((err) => {
        this.logger.warn(`Could not publish audit log entry: ${(err as Error).message}`);
      });
    }

    // HttpException'ın response gövdesindeki standart-dışı ek alanları (örn.
    // hesap kilidinde `lockedUntil`, `remainingMinutes`) istemciye geçir -
    // frontend bunlarla canlı geri sayım gibi zengin davranış üretebilir.
    const extra = isHttpException ? extractExtra(exception as HttpException) : {};

    response.status(status).json({
      success: false,
      data: null,
      error: { message, statusCode: status, ...extra },
    });
  }
}

/** HttpException gövdesindeki message/statusCode/error dışındaki ek alanlar (ör. lockedUntil). */
function extractExtra(exception: HttpException): Record<string, unknown> {
  const response = exception.getResponse();
  if (!response || typeof response !== 'object') return {};
  const { message: _m, statusCode: _s, error: _e, ...rest } = response as Record<string, unknown>;
  return rest;
}

/**
 * NestJS's built-in ValidationPipe throws a BadRequestException whose
 * top-level `.message` is just the generic "Bad Request Exception" string -
 * the actual per-field validation errors live in `.getResponse().message`
 * (a string array). Without this, callers only ever see the generic string
 * instead of e.g. "şifre en az 8 karakter olmalıdır".
 */
function extractMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object' && 'message' in response) {
    const msg = (response as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return exception.message;
}
