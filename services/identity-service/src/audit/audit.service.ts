import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { AuditLogEntryPayload, EventRoutingKey } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService, private readonly rabbitMq: RabbitMqService) {}

  async onModuleInit(): Promise<void> {
    // Identity Service is the single writer of the centralized audit log:
    // every other service publishes audit.log.entry instead of touching
    // this database directly.
    await this.rabbitMq.subscribe<AuditLogEntryPayload>(
      'identity.audit-log-consumer',
      [EventRoutingKey.AUDIT_LOG_ENTRY],
      async (payload) => {
        await this.record(payload);
      },
    );
  }

  async record(entry: AuditLogEntryPayload): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.user_id,
        action: entry.action,
        ip: entry.ip,
        result: entry.result,
        resourceId: entry.resource_id,
        detail: entry.detail,
      },
    });
  }

  async findAll(limit = 200) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}
