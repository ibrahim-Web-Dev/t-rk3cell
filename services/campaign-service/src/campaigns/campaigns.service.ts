import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import {
  CampaignCreatedPayload,
  CampaignTargetedPayload,
  CaseAssignedPayload,
  EventRoutingKey,
  Priority,
  Role,
  SLA_HOURS_BY_PRIORITY,
  SegmentType,
} from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AiClientService } from '../ai-client/ai-client.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { getCaseConversionThreshold } from './case-conversion-threshold';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  private async generateCampaignNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.prisma.campaignSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `CMP-${year}-${String(seq.lastNumber).padStart(6, '0')}`;
  }

  async create(dto: CreateCampaignDto, createdByUserId: string, bearerToken: string) {
    const campaignNumber = await this.generateCampaignNumber();
    const campaign = await this.prisma.campaign.create({
      data: {
        campaignNumber,
        title: dto.title,
        type: dto.type,
        targetSegmentHint: dto.targetSegmentHint,
        discountRate: dto.discountRate,
        validUntil: new Date(dto.validUntil),
        createdBy: createdByUserId,
      },
    });

    const createdPayload: CampaignCreatedPayload = {
      campaign_id: campaign.id,
      campaign_number: campaign.campaignNumber,
      type: campaign.type as unknown as CampaignCreatedPayload['type'],
      target_segment: (campaign.targetSegmentHint as unknown as SegmentType) ?? null,
      discount_rate: campaign.discountRate,
      valid_until: campaign.validUntil.toISOString(),
    };
    await this.rabbitMq.publish(EventRoutingKey.CAMPAIGN_CREATED, createdPayload);

    // Task 2 (AI Service): classify the campaign's segment, priority and
    // expected conversion probability. This ALWAYS gets recorded on the
    // campaign itself (every targeted campaign gets a classification) -
    // whether it also becomes an optimization case is a separate decision
    // made right below.
    const classifyResult = await this.aiClient.classify(
      {
        campaignId: campaign.id,
        campaignNumber: campaign.campaignNumber,
        type: campaign.type,
        targetSegmentHint: (dto.targetSegmentHint as SegmentType) ?? null,
        discountRate: campaign.discountRate,
      },
      bearerToken,
    );

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        aiSegment: classifyResult?.segment,
        aiPriority: classifyResult?.priority,
        aiConfidence: classifyResult?.confidence,
        aiConversionProbability: classifyResult?.conversionProbability,
        wasAiClassified: !!classifyResult,
      },
    });

    // A campaign becomes an optimization case only when:
    //  - AI Service was unreachable (fallback: always open one in the manual
    //    queue so it doesn't silently ship unreviewed - case doc 2.2), or
    //  - AI Service predicted a conversion probability below the threshold.
    // Otherwise the campaign is "healthy" - it still gets subscriber offers
    // (Task 1, below) but no expert ever needs to look at it.
    const needsCase = !classifyResult || classifyResult.conversionProbability < getCaseConversionThreshold();

    if (needsCase) {
      const segment = classifyResult?.segment ?? SegmentType.BELIRSIZ;
      const priority = classifyResult?.priority ?? Priority.ORTA;
      const slaHours = SLA_HOURS_BY_PRIORITY[priority];
      const now = new Date();

      let optimizationCase = await this.prisma.optimizationCase.create({
        data: {
          campaignId: campaign.id,
          segment,
          priority,
          wasAiClassified: !!classifyResult,
          conversionProbability: classifyResult?.conversionProbability,
          aiConfidence: classifyResult?.confidence,
          slaStartedAt: now,
          slaDueAt: new Date(now.getTime() + slaHours * 3_600_000),
        },
      });

      // Task 3 (AI Service): attempt automatic expert assignment.
      const assignResult = await this.aiClient.assignExpert(
        {
          caseId: optimizationCase.id,
          segment: segment as unknown as SegmentType,
          priority: priority as unknown as Priority,
        },
        bearerToken,
      );

      if (assignResult?.expertId) {
        optimizationCase = await this.prisma.optimizationCase.update({
          where: { id: optimizationCase.id },
          data: {
            assignedExpertId: assignResult.expertId,
            assignmentScore: assignResult.score,
            status: 'ATANDI',
          },
        });
        await this.prisma.caseStatusHistory.create({
          data: {
            caseId: optimizationCase.id,
            fromStatus: 'YENI',
            toStatus: 'ATANDI',
            changedBy: 'system-ai',
          },
        });
        const assignedPayload: CaseAssignedPayload = {
          case_id: optimizationCase.id,
          campaign_id: campaign.id,
          expert_id: assignResult.expertId,
          segment: segment as unknown as SegmentType,
          priority: priority as unknown as Priority,
          assignment_score: assignResult.score,
        };
        await this.rabbitMq.publish(EventRoutingKey.CASE_ASSIGNED, assignedPayload);
      }
    }

    // Task 1 (AI Service): per-subscriber recommendation scoring. Runs
    // regardless of whether a case was opened - subscribers still get
    // personalized offers for healthy campaigns.
    if (dto.targetSubscriberIds?.length) {
      const targetedPayload: CampaignTargetedPayload = {
        campaign_id: campaign.id,
        campaign_number: campaign.campaignNumber,
        subscriber_ids: dto.targetSubscriberIds,
      };
      await this.rabbitMq.publish(EventRoutingKey.CAMPAIGN_TARGETED, targetedPayload);

      for (const subscriberId of dto.targetSubscriberIds) {
        const recommendation = await this.aiClient.recommend(
          {
            campaignId: campaign.id,
            subscriberId,
            campaignType: campaign.type,
            discountRate: campaign.discountRate,
          },
          bearerToken,
        );
        if (recommendation) {
          await this.prisma.subscriberOffer.create({
            data: {
              campaignId: campaign.id,
              subscriberId,
              score: recommendation.score,
              conversionProbability: recommendation.conversionProbability,
            },
          });
        }
      }
    }

    return this.findOneInternal(campaign.id);
  }

  async findAll(requester: { sub: string; role: Role }) {
    const where =
      requester.role === Role.PERSONEL
        ? { OR: [{ createdBy: requester.sub }, { optimizationCase: { assignedExpertId: requester.sub } }] }
        : {};
    return this.prisma.campaign.findMany({
      where,
      include: { optimizationCase: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requester: { sub: string; role: Role }) {
    const campaign = await this.findOneInternal(id);
    const isOwnCampaign = campaign.createdBy === requester.sub;
    const isAssignedCase = campaign.optimizationCase?.assignedExpertId === requester.sub;
    if (requester.role === Role.PERSONEL && !isOwnCampaign && !isAssignedCase) {
      throw new ForbiddenException('Bu kampanyaya erişim yetkiniz yok');
    }
    return campaign;
  }

  private async findOneInternal(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { optimizationCase: true, offers: true },
    });
    if (!campaign) throw new NotFoundException('Kampanya bulunamadı');
    return campaign;
  }
}
