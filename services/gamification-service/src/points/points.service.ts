import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import {
  CampaignOptimizedPayload,
  CaseAssignedPayload,
  EventRoutingKey,
  PointsUpdatedPayload,
  SatisfactionRatedPayload,
  SlaBreachedPayload,
  computeLevel,
} from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BadgesService } from '../badges/badges.service';

const TWO_HOURS_MS = 2 * 3_600_000;
/** Assumption (not specified numerically in the case doc): a conversion lift of >= 15% counts as "hedef aşıldı". Documented here and in README. */
const CONVERSION_TARGET_THRESHOLD = 0.15;
const LOW_SATISFACTION_MAX_STARS = 2;

@Injectable()
export class PointsService implements OnModuleInit {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rabbitMq: RabbitMqService,
    private readonly realtime: RealtimeGateway,
    private readonly badges: BadgesService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMq.subscribe<CampaignOptimizedPayload>(
      'gamification.campaign-optimized',
      [EventRoutingKey.CAMPAIGN_OPTIMIZED],
      (payload) => this.handleCampaignOptimized(payload),
    );
    await this.rabbitMq.subscribe<SlaBreachedPayload>(
      'gamification.sla-breached',
      [EventRoutingKey.SLA_BREACHED],
      (payload) => this.handleSlaBreached(payload),
    );
    await this.rabbitMq.subscribe<SatisfactionRatedPayload>(
      'gamification.satisfaction-rated',
      [EventRoutingKey.SATISFACTION_RATED],
      (payload) => this.handleSatisfactionRated(payload),
    );
    await this.rabbitMq.subscribe<CaseAssignedPayload>(
      'gamification.case-assigned',
      [EventRoutingKey.CASE_ASSIGNED],
      (payload) => this.handleCaseAssigned(payload),
    );
  }

  private async addPoints(userId: string, points: number, reason: string, refCaseId?: string): Promise<void> {
    await this.prisma.pointsLedger.create({ data: { userId, points, reason, refCaseId } });

    const stats = await this.prisma.userStats.upsert({
      where: { userId },
      create: { userId, totalPoints: points, level: computeLevel(points) },
      update: { totalPoints: { increment: points } },
    });
    const newLevel = computeLevel(stats.totalPoints);
    if (newLevel !== stats.level) {
      await this.prisma.userStats.update({ where: { userId }, data: { level: newLevel } });
    }

    await this.redis.recordPoints(userId, points);
    this.realtime.notifyPointsUpdated(userId, stats.totalPoints, points, reason);

    const payload: PointsUpdatedPayload = {
      user_id: userId,
      delta: points,
      total_points: stats.totalPoints,
      reason,
    };
    await this.rabbitMq.publish(EventRoutingKey.POINTS_UPDATED, payload);
  }

  private async handleCampaignOptimized(payload: CampaignOptimizedPayload): Promise<void> {
    const userId = payload.expert_id;
    const durationMs = new Date(payload.completed_at).getTime() - new Date(payload.created_at).getTime();
    const isFast = durationMs > 0 && durationMs < TWO_HOURS_MS;
    const isConversionExceeded = (payload.conversion_lift ?? 0) >= CONVERSION_TARGET_THRESHOLD;
    const isCriticalSlaMet = payload.priority === 'KRITIK' && !payload.sla_breached;

    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.prisma.userStats.findUnique({ where: { userId } });
    const isNewDay = existing?.dailyCompletionDate !== today;
    const segmentCounts = ((existing?.segmentCounts as Record<string, number>) ?? {}) as Record<string, number>;
    segmentCounts[payload.segment] = (segmentCounts[payload.segment] ?? 0) + 1;
    const isRiskliKayip = payload.segment === 'RISKLI_KAYIP';

    await this.prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        completedCaseCount: 1,
        fastCompletionCount: isFast ? 1 : 0,
        conversionExceedCount: isConversionExceeded ? 1 : 0,
        riskliKayipRescueCount: isRiskliKayip ? 1 : 0,
        dailyCompletionDate: today,
        dailyCompletionCount: 1,
        segmentCounts,
      },
      update: {
        completedCaseCount: { increment: 1 },
        fastCompletionCount: isFast ? { increment: 1 } : undefined,
        conversionExceedCount: isConversionExceeded ? { increment: 1 } : undefined,
        riskliKayipRescueCount: isRiskliKayip ? { increment: 1 } : undefined,
        dailyCompletionDate: today,
        dailyCompletionCount: isNewDay ? 1 : { increment: 1 },
        segmentCounts,
      },
    });

    await this.addPoints(userId, 10, 'OPTIMIZATION_COMPLETED', payload.case_id);
    if (isFast) await this.addPoints(userId, 5, 'FAST_BONUS', payload.case_id);
    if (isConversionExceeded) await this.addPoints(userId, 15, 'CONVERSION_TARGET_EXCEEDED', payload.case_id);
    if (isCriticalSlaMet) await this.addPoints(userId, 15, 'CRITICAL_SLA_MET', payload.case_id);

    const finalStats = await this.prisma.userStats.findUnique({ where: { userId } });
    if (finalStats) await this.badges.evaluateAndAward(userId, finalStats);
  }

  private async handleSlaBreached(payload: SlaBreachedPayload): Promise<void> {
    const cache = await this.prisma.caseAssignmentCache.findUnique({ where: { caseId: payload.case_id } });
    if (!cache?.expertId) return;
    await this.addPoints(cache.expertId, -5, 'SLA_BREACH', payload.case_id);
  }

  private async handleSatisfactionRated(payload: SatisfactionRatedPayload): Promise<void> {
    if (payload.stars > LOW_SATISFACTION_MAX_STARS) return;
    const cache = await this.prisma.caseAssignmentCache.findFirst({
      where: { campaignId: payload.campaign_id },
    });
    if (!cache?.expertId) return;
    await this.addPoints(cache.expertId, -3, 'LOW_SATISFACTION', cache.caseId);
  }

  private async handleCaseAssigned(payload: CaseAssignedPayload): Promise<void> {
    if (!payload.expert_id) return;
    await this.prisma.caseAssignmentCache.upsert({
      where: { caseId: payload.case_id },
      create: { caseId: payload.case_id, campaignId: payload.campaign_id, expertId: payload.expert_id },
      update: { campaignId: payload.campaign_id, expertId: payload.expert_id },
    });
  }
}
