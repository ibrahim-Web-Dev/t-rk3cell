import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RabbitMqService } from '@campaigncell/event-bus';
import { EventRoutingKey, SlaBreachedPayload } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUSES = ['YENI', 'ATANDI', 'OPTIMIZE_EDILIYOR', 'TEST_EDILIYOR'] as const;

/**
 * Background jobs for the two time-driven rules in the case doc:
 *  - SLA breach detection (section 4.4): flags cases whose SLA clock ran out
 *    while still active, publishes `sla.breached` (Gamification applies the
 *    -5 penalty), so the SLA colour-coding shown to experts/supervisors is
 *    based on real, persisted state rather than being computed only in the UI.
 *  - Campaign archival (section 4.2, YAYINDA -> ARSIVLENDI "Geçerlilik doldu").
 */
@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(private readonly prisma: PrismaService, private readonly rabbitMq: RabbitMqService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaBreaches(): Promise<void> {
    const breached = await this.prisma.optimizationCase.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] }, slaBreached: false, slaDueAt: { lt: new Date() } },
    });

    for (const c of breached) {
      await this.prisma.optimizationCase.update({ where: { id: c.id }, data: { slaBreached: true } });
      const payload: SlaBreachedPayload = {
        case_id: c.id,
        priority: c.priority as unknown as SlaBreachedPayload['priority'],
        sla_hours: Math.round((c.slaDueAt.getTime() - c.slaStartedAt.getTime()) / 3_600_000),
        breached_at: new Date().toISOString(),
      };
      await this.rabbitMq.publish(EventRoutingKey.SLA_BREACHED, payload);
    }
    if (breached.length > 0) {
      this.logger.warn(`${breached.length} vaka SLA aşımına uğradı`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async archiveExpiredCampaigns(): Promise<void> {
    const expiredCases = await this.prisma.optimizationCase.findMany({
      where: { status: 'YAYINDA', campaign: { validUntil: { lt: new Date() } } },
    });
    for (const c of expiredCases) {
      await this.prisma.optimizationCase.update({ where: { id: c.id }, data: { status: 'ARSIVLENDI' } });
      await this.prisma.caseStatusHistory.create({
        data: { caseId: c.id, fromStatus: 'YAYINDA', toStatus: 'ARSIVLENDI', changedBy: 'system-scheduler' },
      });
    }
    if (expiredCases.length > 0) {
      this.logger.log(`${expiredCases.length} kampanya arşivlendi (geçerlilik doldu)`);
    }
  }
}
