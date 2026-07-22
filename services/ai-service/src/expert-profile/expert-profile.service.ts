import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import {
  CaseAssignedPayload,
  CampaignOptimizedPayload,
  EventRoutingKey,
  StaffCreatedPayload,
  StaffUpdatedPayload,
} from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Local read-model of expert specialties/capacity/performance. Maintained
 * exclusively by consuming events from Identity Service (staff.created/
 * updated) and Campaign Service (case.assigned, campaign.optimized) - this
 * service NEVER queries Identity's or Campaign's databases directly, which
 * is what keeps database-per-service intact while still letting the
 * assignment formula (case doc 5.3) see specialties + workload + performance.
 */
@Injectable()
export class ExpertProfileService implements OnModuleInit {
  private readonly logger = new Logger(ExpertProfileService.name);

  constructor(private readonly prisma: PrismaService, private readonly rabbitMq: RabbitMqService) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMq.subscribe<StaffCreatedPayload>(
      'ai-service.staff-created',
      [EventRoutingKey.STAFF_CREATED],
      async (payload) => {
        await this.prisma.expertProfile.upsert({
          where: { userId: payload.user_id },
          create: { userId: payload.user_id, specialties: payload.specialties, regions: payload.regions },
          update: { specialties: payload.specialties, regions: payload.regions },
        });
      },
    );

    await this.rabbitMq.subscribe<StaffUpdatedPayload>(
      'ai-service.staff-updated',
      [EventRoutingKey.STAFF_UPDATED],
      async (payload) => {
        await this.prisma.expertProfile.upsert({
          where: { userId: payload.user_id },
          create: { userId: payload.user_id, specialties: payload.specialties, regions: payload.regions },
          update: { specialties: payload.specialties, regions: payload.regions },
        });
      },
    );

    await this.rabbitMq.subscribe<CaseAssignedPayload>(
      'ai-service.case-assigned',
      [EventRoutingKey.CASE_ASSIGNED],
      async (payload) => {
        if (!payload.expert_id) return;
        await this.prisma.expertProfile.upsert({
          where: { userId: payload.expert_id },
          create: { userId: payload.expert_id, activeCaseCount: 1 },
          update: { activeCaseCount: { increment: 1 } },
        });
      },
    );

    await this.rabbitMq.subscribe<CampaignOptimizedPayload>(
      'ai-service.campaign-optimized',
      [EventRoutingKey.CAMPAIGN_OPTIMIZED],
      async (payload) => {
        const clampedLift = Math.max(0, Math.min(1, payload.conversion_lift ?? 0));
        const existing = await this.prisma.expertProfile.findUnique({ where: { userId: payload.expert_id } });
        const previousScore = existing?.performanceScore ?? 0.5;
        const newScore = Math.round((previousScore * 0.7 + clampedLift * 0.3) * 1000) / 1000;
        const nextActiveCount = Math.max(0, (existing?.activeCaseCount ?? 1) - 1);

        await this.prisma.expertProfile.upsert({
          where: { userId: payload.expert_id },
          create: {
            userId: payload.expert_id,
            activeCaseCount: 0,
            completedCaseCount: 1,
            performanceScore: newScore,
          },
          update: {
            activeCaseCount: nextActiveCount,
            completedCaseCount: { increment: 1 },
            performanceScore: newScore,
          },
        });
      },
    );

    this.logger.log('Expert read-model event consumers hazır');
  }

  async findAll() {
    return this.prisma.expertProfile.findMany({ orderBy: { userId: 'asc' } });
  }
}
