import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { AuditLogEntryPayload, EventRoutingKey } from '@campaigncell/shared-types';

/**
 * Publishes `audit.log.entry` events so Identity Service's centralized audit
 * log captures the "kritik durum değişiklikleri" and "kampanya silme" events
 * required by case doc 3.4 - not just the 401/403 access failures that
 * AllExceptionsFilter already records.
 *
 * Fire-and-forget: an audit publish failure must never break the business
 * action that triggered it.
 */
@Injectable()
export class AuditPublisher {
  private readonly logger = new Logger(AuditPublisher.name);

  constructor(private readonly rabbitMq: RabbitMqService) {}

  record(entry: AuditLogEntryPayload): void {
    this.rabbitMq.publish(EventRoutingKey.AUDIT_LOG_ENTRY, entry).catch((err) => {
      this.logger.warn(`Audit log kaydı yayınlanamadı: ${(err as Error).message}`);
    });
  }
}
