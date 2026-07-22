import { Injectable } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { BadgeEarnedPayload, EventRoutingKey } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { evaluateNewBadges, StatsSnapshot } from './badge-rules';

interface UserStatsRow {
  userId: string;
  completedCaseCount: number;
  fastCompletionCount: number;
  conversionExceedCount: number;
  riskliKayipRescueCount: number;
  dailyCompletionCount: number;
  segmentCounts: unknown;
}

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async evaluateAndAward(userId: string, stats: UserStatsRow): Promise<string[]> {
    const existing = await this.prisma.badge.findMany({ where: { userId }, select: { badgeCode: true } });
    const alreadyEarned = new Set(existing.map((b) => b.badgeCode));

    const snapshot: StatsSnapshot = {
      completedCaseCount: stats.completedCaseCount,
      fastCompletionCount: stats.fastCompletionCount,
      conversionExceedCount: stats.conversionExceedCount,
      riskliKayipRescueCount: stats.riskliKayipRescueCount,
      dailyCompletionCount: stats.dailyCompletionCount,
      segmentCounts: (stats.segmentCounts as Record<string, number>) ?? {},
    };

    const newlyEarned = evaluateNewBadges(snapshot, alreadyEarned);

    for (const badgeCode of newlyEarned) {
      await this.prisma.badge.create({ data: { userId, badgeCode } });
      const payload: BadgeEarnedPayload = { user_id: userId, badge_code: badgeCode, earned_at: new Date().toISOString() };
      await this.rabbitMq.publish(EventRoutingKey.BADGE_EARNED, payload);
      this.realtime.notifyBadgeEarned(userId, badgeCode);
    }

    return newlyEarned;
  }

  async listForUser(userId: string) {
    return this.prisma.badge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });
  }
}
