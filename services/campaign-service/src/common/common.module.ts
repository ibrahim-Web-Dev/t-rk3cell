import { Global, Module } from '@nestjs/common';
import { AuditPublisher } from './audit-publisher';

/** Provides cross-cutting helpers (audit publishing) to every feature module. */
@Global()
@Module({
  providers: [AuditPublisher],
  exports: [AuditPublisher],
})
export class CommonModule {}
