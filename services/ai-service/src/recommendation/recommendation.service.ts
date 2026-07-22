import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { AiRecommendationCreatedPayload, EventRoutingKey, OfferRespondedPayload } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendRequestDto } from './dto/recommend-request.dto';
import { SCORING_STRATEGY } from './recommendation.constants';
import { ScoringStrategy } from './scoring-strategy.interface';

const MIN_VISIBLE_SCORE = 0.6;
const PRIORITIZED_SCORE = 0.8;

@Injectable()
export class RecommendationService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @Inject(SCORING_STRATEGY) private readonly strategy: ScoringStrategy,
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Case doc 4.5: subscriber rejections dampen future scores for similar
    // campaigns. Campaign Service publishes this; we just keep our own copy.
    await this.rabbitMq.subscribe<OfferRespondedPayload>(
      'ai-service.offer-responded',
      [EventRoutingKey.OFFER_RESPONDED],
      async (payload) => {
        if (payload.response === 'ILGILENMIYORUM') {
          // campaignType isn't in this payload; Campaign Service could be
          // extended to include it. For now we record against subscriberId
          // with a generic bucket so the dampening still applies broadly.
          await this.prisma.offerFeedback.create({
            data: { subscriberId: payload.subscriber_id, campaignType: 'ANY', response: payload.response },
          });
        }
      },
    );
  }

  async recommend(dto: RecommendRequestDto) {
    const priorRejectionCount = await this.prisma.offerFeedback.count({
      where: {
        subscriberId: dto.subscriberId,
        response: 'ILGILENMIYORUM',
        OR: [{ campaignType: dto.campaignType }, { campaignType: 'ANY' }],
      },
    });

    const result = await this.strategy.score({
      campaignId: dto.campaignId,
      subscriberId: dto.subscriberId,
      campaignType: dto.campaignType,
      discountRate: dto.discountRate,
      priorRejectionCount,
    });

    await this.prisma.recommendation.upsert({
      where: { campaignId_subscriberId: { campaignId: dto.campaignId, subscriberId: dto.subscriberId } },
      create: {
        campaignId: dto.campaignId,
        subscriberId: dto.subscriberId,
        score: result.score,
        conversionProbability: result.conversionProbability,
        modelSource: result.modelSource,
      },
      update: { score: result.score, conversionProbability: result.conversionProbability, modelSource: result.modelSource },
    });

    const payload: AiRecommendationCreatedPayload = {
      campaign_id: dto.campaignId,
      subscriber_id: dto.subscriberId,
      score: result.score,
      conversion_probability: result.conversionProbability,
    };
    await this.rabbitMq.publish(EventRoutingKey.AI_RECOMMENDATION_CREATED, payload);

    if (result.score >= PRIORITIZED_SCORE) {
      this.logger.log(`Yüksek öncelikli öneri: campaign=${dto.campaignId} subscriber=${dto.subscriberId}`);
    }

    return {
      ...result,
      visible: result.score >= MIN_VISIBLE_SCORE,
    };
  }

  /** Frontend AI insights sayfası için şeffaflık: kaç öneri gerçek ML modeliyle, kaçı kural tabanlı fallback ile üretildi. */
  async modelSourceStats() {
    const total = await this.prisma.recommendation.count();
    const mlCount = await this.prisma.recommendation.count({ where: { modelSource: 'ml' } });
    return { total, mlCount, ruleBasedCount: total - mlCount };
  }
}
