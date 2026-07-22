import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { AiAssignmentSuggestedPayload, EventRoutingKey } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { ExpertProfileService } from '../expert-profile/expert-profile.service';
import { computeAssignmentScore, hasCapacity } from './assignment-scoring';
import { AssignRequestDto } from './dto/assign-request.dto';

export interface AssignmentResult {
  expertId: string | null;
  score: number | null;
  queued: boolean;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly expertProfiles: ExpertProfileService,
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  async assign(dto: AssignRequestDto): Promise<AssignmentResult> {
    const experts = await this.expertProfiles.findAll();
    const candidates = experts.filter(hasCapacity);

    let result: AssignmentResult;
    if (candidates.length === 0) {
      this.logger.warn(`Uygun kapasitede uzman yok, vaka kuyruğa alınıyor: case=${dto.caseId}`);
      result = { expertId: null, score: null, queued: true };
    } else {
      const scored = candidates
        .map((expert) => ({ expertId: expert.userId, score: computeAssignmentScore(expert, dto.segment) }))
        .sort((a, b) => b.score - a.score);
      const best = scored[0];
      result = { expertId: best.expertId, score: best.score, queued: false };
    }

    await this.prisma.assignmentLog.create({
      data: { caseId: dto.caseId, expertId: result.expertId, score: result.score, queued: result.queued },
    });

    const payload: AiAssignmentSuggestedPayload = {
      case_id: dto.caseId,
      expert_id: result.expertId,
      score: result.score,
      queued: result.queued,
    };
    await this.rabbitMq.publish(EventRoutingKey.AI_ASSIGNMENT_SUGGESTED, payload);

    return result;
  }
}
