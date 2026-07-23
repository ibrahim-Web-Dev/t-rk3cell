import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
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
  SubscriberRegisteredPayload,
} from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditPublisher } from '../common/audit-publisher';
import { AiClientService } from '../ai-client/ai-client.service';
import { mintSystemBearerToken } from '../ai-client/system-token';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { getCaseConversionThreshold } from './case-conversion-threshold';

// Yeni aboneye açılışta gösterilecek "hoş geldin" teklif sayısı ve garanti
// görünürlük tabanı. Yeni abonenin AI telemetrisi henüz yok; kural tabanlı
// skor 0.60 görünürlük eşiğinin altında kalıp teklifleri gizleyebiliyordu.
// Bunlar bilinçli olarak "onboarding" için seçilmiş YENI_ABONE kampanyaları
// olduğundan, skoru en az WELCOME_MIN_SCORE'a yükseltip görünür kılıyoruz
// (gerçek AI dönüşüm olasılığı conversionProbability alanında korunuyor).
const MAX_WELCOME_OFFERS = 3;
const WELCOME_MIN_SCORE = 0.66;

@Injectable()
export class CampaignsService implements OnModuleInit {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
    private readonly rabbitMq: RabbitMqService,
    private readonly audit: AuditPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    // Case doc 4.1 spirit: a brand new subscriber should see personalized
    // offers right away, not an empty screen until a campaign manager
    // happens to target them explicitly. We auto-generate offers from
    // existing YENI_ABONE-segmented campaigns using the same Task 1 scoring
    // path as manual targeting (see createWelcomeOffers below).
    await this.rabbitMq.subscribe<SubscriberRegisteredPayload>(
      'campaign-service.subscriber-registered',
      [EventRoutingKey.SUBSCRIBER_REGISTERED],
      async (payload) => {
        await this.createWelcomeOffers(payload.subscriber_id);
      },
    );
  }

  /**
   * Finds still-valid campaigns the AI already classified as YENI_ABONE
   * (case doc's "yeni başlayan" segment) and scores/offers them to a
   * just-registered subscriber - the same Task 1 (/ai/recommend) call a
   * manually-targeted campaign would trigger, just initiated by an event
   * instead of a campaign-manager request (so there is no caller JWT to
   * forward - see mintSystemBearerToken).
   */
  private async createWelcomeOffers(subscriberId: string): Promise<void> {
    const candidates = await this.prisma.campaign.findMany({
      where: { aiSegment: 'YENI_ABONE', validUntil: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: MAX_WELCOME_OFFERS,
    });

    if (candidates.length === 0) return;

    const bearerToken = mintSystemBearerToken();
    let created = 0;
    for (const campaign of candidates) {
      const recommendation = await this.aiClient.recommend(
        { campaignId: campaign.id, subscriberId, campaignType: campaign.type, discountRate: campaign.discountRate },
        bearerToken,
      );
      // AI erişilemese bile yeni abone boş ekranla karşılaşmasın: skor için
      // görünür bir taban kullanılır, gerçek dönüşüm olasılığı (varsa) korunur.
      const conversionProbability = recommendation?.conversionProbability ?? WELCOME_MIN_SCORE;
      const score = Math.max(recommendation?.score ?? 0, WELCOME_MIN_SCORE);
      await this.prisma.subscriberOffer.upsert({
        where: { campaignId_subscriberId: { campaignId: campaign.id, subscriberId } },
        create: { campaignId: campaign.id, subscriberId, score, conversionProbability },
        update: { score, conversionProbability },
      });
      created += 1;
    }
    this.logger.log(`Yeni abone (${subscriberId}) için ${created} görünür hoş geldin teklifi oluşturuldu.`);
  }

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

  /**
   * Kampanya silme (case doc 3.4: "Kampanya silme" audit'e yazılmalı). Yalnızca
   * ADMIN (controller seviyesinde). İlişkili optimizasyon vakası, teklifler ve
   * durum geçmişi tek bir transaction içinde temizlenir; işlem merkezi audit
   * log'a kaydedilir.
   */
  async remove(id: string, requester: { sub: string; role: Role; ip?: string | null }) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { optimizationCase: true },
    });
    if (!campaign) throw new NotFoundException('Kampanya bulunamadı');

    await this.prisma.$transaction(async (tx) => {
      if (campaign.optimizationCase) {
        await tx.caseStatusHistory.deleteMany({ where: { caseId: campaign.optimizationCase.id } });
        await tx.optimizationCase.delete({ where: { id: campaign.optimizationCase.id } });
      }
      await tx.subscriberOffer.deleteMany({ where: { campaignId: id } });
      await tx.campaign.delete({ where: { id } });
    });

    this.audit.record({
      user_id: requester.sub,
      action: 'campaign-deleted',
      ip: requester.ip ?? null,
      result: 'SUCCESS',
      resource_id: id,
      detail: `Kampanya silindi: ${campaign.campaignNumber} - "${campaign.title}"`,
    });

    return { deleted: true, id };
  }
}
