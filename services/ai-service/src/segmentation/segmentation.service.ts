import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { AiSegmentAssignedPayload, CampaignSegmentChangedPayload, EventRoutingKey } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { SegmentType as PrismaSegmentType } from '../generated/prisma-client';
import { ClassifyRequestDto } from './dto/classify-request.dto';
import { CLASSIFICATION_STRATEGY } from './segmentation.constants';
import { ClassificationStrategy } from './classification-strategy.interface';

@Injectable()
export class SegmentationService implements OnModuleInit {
  constructor(
    @Inject(CLASSIFICATION_STRATEGY) private readonly strategy: ClassificationStrategy,
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Case doc 5.4: when a human overrides the AI-assigned segment, that is
    // recorded as a misclassification (unless they "override" to the exact
    // same value, in which case we count it as a confirmation).
    await this.rabbitMq.subscribe<CampaignSegmentChangedPayload>(
      'ai-service.segment-changed',
      [EventRoutingKey.CAMPAIGN_SEGMENT_CHANGED],
      async (payload) => {
        if (!payload.was_ai_assigned) return;
        const prediction = await this.prisma.segmentPrediction.findUnique({
          where: { campaignId: payload.campaign_id },
        });
        if (!prediction || prediction.isCorrect !== null) return;

        const newSegment = payload.new_segment as unknown as PrismaSegmentType;
        const isCorrect = prediction.predictedSegment === newSegment;
        await this.prisma.segmentPrediction.update({
          where: { campaignId: payload.campaign_id },
          data: {
            isCorrect,
            correctedSegment: isCorrect ? null : newSegment,
            correctedBy: isCorrect ? null : payload.changed_by,
            correctedAt: new Date(),
          },
        });
      },
    );
  }

  async classify(dto: ClassifyRequestDto) {
    const result = this.strategy.classify({
      campaignId: dto.campaignId,
      campaignType: dto.type,
      targetSegmentHint: dto.targetSegmentHint ?? null,
      discountRate: dto.discountRate,
    });

    await this.prisma.segmentPrediction.upsert({
      where: { campaignId: dto.campaignId },
      create: {
        campaignId: dto.campaignId,
        predictedSegment: result.segment,
        predictedPriority: result.priority,
        confidence: result.confidence,
      },
      update: {
        predictedSegment: result.segment,
        predictedPriority: result.priority,
        confidence: result.confidence,
      },
    });

    const payload: AiSegmentAssignedPayload = {
      case_id: dto.campaignId,
      campaign_id: dto.campaignId,
      segment: result.segment,
      priority: result.priority,
      confidence: result.confidence,
    };
    await this.rabbitMq.publish(EventRoutingKey.AI_SEGMENT_ASSIGNED, payload);

    return result;
  }

  async accuracyOverall() {
    const total = await this.prisma.segmentPrediction.count();
    const incorrect = await this.prisma.segmentPrediction.count({ where: { isCorrect: false } });
    return {
      total,
      incorrect,
      accuracyRate: total === 0 ? null : Math.round(((total - incorrect) / total) * 1000) / 10,
    };
  }

  async accuracyByCategory() {
    const predictions = await this.prisma.segmentPrediction.findMany({
      select: { predictedSegment: true, isCorrect: true },
    });
    const buckets = new Map<string, { total: number; incorrect: number }>();
    for (const p of predictions) {
      const bucket = buckets.get(p.predictedSegment) ?? { total: 0, incorrect: 0 };
      bucket.total += 1;
      if (p.isCorrect === false) bucket.incorrect += 1;
      buckets.set(p.predictedSegment, bucket);
    }
    return Array.from(buckets.entries()).map(([segment, b]) => ({
      segment,
      total: b.total,
      incorrect: b.incorrect,
      accuracyRate: b.total === 0 ? null : Math.round(((b.total - b.incorrect) / b.total) * 1000) / 10,
    }));
  }

  /** Frontend design doc §14.3 "Override tablosu": her yanlış sınıflandırma kaydı. */
  async listOverrides(limit = 100) {
    return this.prisma.segmentPrediction.findMany({
      where: { isCorrect: false },
      orderBy: { correctedAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
