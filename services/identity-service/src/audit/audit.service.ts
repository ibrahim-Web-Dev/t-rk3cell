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

  /**
   * Audit satırları yalnızca `userId` (bir UUID) taşır - farklı kullanıcıları
   * ayırt etmek için ekranda bunu kısaltıp göstermek yanıltıcıdır, çünkü demo
   * seed ID'leri (`DEMO_SEED_IDS`) hepsi aynı "00000000-..." önekiyle
   * başlar, yalnızca son segment değişir. Bu yüzden gösterim için
   * userId -> email/GSM/ad-soyad eşlemesini AYNI veritabanında (Identity
   * Service zaten User tablosunun sahibi) tek bir sorguda çözüyoruz - başka
   * bir servisin veritabanına dokunmuyoruz.
   */
  async findAll(limit = 200) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });

    const userIds = Array.from(new Set(logs.map((l) => l.userId).filter((id): id is string => !!id)));
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, gsm: true, firstName: true, lastName: true, role: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => {
      const user = log.userId ? userById.get(log.userId) : undefined;
      const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
      const userLabel = user ? user.email ?? (fullName || user.gsm) ?? null : null;
      return { ...log, userLabel };
    });
  }
}
