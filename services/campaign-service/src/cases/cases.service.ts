import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import {
  CampaignOptimizedPayload,
  CampaignSegmentChangedPayload,
  CaseAssignedPayload,
  CaseStatusChangedPayload,
  EventRoutingKey,
  Role,
} from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStatus } from '../generated/prisma-client';
import { canTransition } from './case-state-machine';
import { CompleteCaseDto } from './dto/complete-case.dto';
import { CompleteTestDto } from './dto/complete-test.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { AssignExpertDto } from './dto/assign-expert.dto';

type Requester = { sub: string; role: Role };

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService, private readonly rabbitMq: RabbitMqService) {}

  async findAll(requester: Requester) {
    const where = requester.role === Role.PERSONEL ? { assignedExpertId: requester.sub } : {};
    return this.prisma.optimizationCase.findMany({
      where,
      include: { campaign: true },
      orderBy: [{ priority: 'desc' }, { slaDueAt: 'asc' }],
    });
  }

  async findPendingQueue() {
    return this.prisma.optimizationCase.findMany({
      where: { OR: [{ segment: 'BELIRSIZ' }, { assignedExpertId: null }], status: { in: ['YENI'] } },
      include: { campaign: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, requester: Requester) {
    const found = await this.getOwnedCase(id, requester);
    return found;
  }

  private async getOwnedCase(id: string, requester: Requester) {
    const found = await this.prisma.optimizationCase.findUnique({ where: { id }, include: { campaign: true } });
    if (!found) throw new NotFoundException('Optimizasyon vakası bulunamadı');
    if (requester.role === Role.PERSONEL && found.assignedExpertId !== requester.sub) {
      throw new ForbiddenException('Bu vakaya erişim yetkiniz yok');
    }
    return found;
  }

  private async transition(
    caseId: string,
    toStatus: CaseStatus,
    changedBy: string,
    extraData: Record<string, unknown> = {},
  ) {
    const current = await this.prisma.optimizationCase.findUnique({ where: { id: caseId } });
    if (!current) throw new NotFoundException('Optimizasyon vakası bulunamadı');
    if (!canTransition(current.status, toStatus)) {
      throw new UnprocessableEntityException(`Geçersiz durum geçişi: ${current.status} -> ${toStatus}`);
    }

    const updated = await this.prisma.optimizationCase.update({
      where: { id: caseId },
      data: { status: toStatus, ...extraData },
    });
    await this.prisma.caseStatusHistory.create({
      data: { caseId, fromStatus: current.status, toStatus, changedBy },
    });

    const payload: CaseStatusChangedPayload = {
      case_id: caseId,
      from_status: current.status as unknown as CaseStatusChangedPayload['from_status'],
      to_status: toStatus as unknown as CaseStatusChangedPayload['to_status'],
      changed_by: changedBy,
      created_at: current.createdAt.toISOString(),
      completed_at: updated.completedAt?.toISOString(),
    };
    await this.rabbitMq.publish(EventRoutingKey.CASE_STATUS_CHANGED, payload);

    return updated;
  }

  async start(id: string, requester: Requester) {
    await this.getOwnedCase(id, requester);
    return this.transition(id, 'OPTIMIZE_EDILIYOR', requester.sub);
  }

  async startTest(id: string, requester: Requester) {
    await this.getOwnedCase(id, requester);
    return this.transition(id, 'TEST_EDILIYOR', requester.sub, { abTestStartedAt: new Date() });
  }

  async completeTest(id: string, requester: Requester, dto: CompleteTestDto) {
    await this.getOwnedCase(id, requester);
    return this.transition(id, 'OPTIMIZE_EDILIYOR', requester.sub, { conversionLift: dto.conversionLift });
  }

  async complete(id: string, requester: Requester, dto: CompleteCaseDto) {
    const current = await this.getOwnedCase(id, requester);
    const completedAt = new Date();
    const updated = await this.transition(id, 'TAMAMLANDI', requester.sub, {
      optimizationNote: dto.optimizationNote,
      conversionLift: dto.conversionLift ?? current.conversionLift,
      completedAt,
    });

    // Dedicated event (case doc section 9.1/9.2) - Gamification Service's
    // primary trigger for points/badges.
    const optimizedPayload: CampaignOptimizedPayload = {
      case_id: updated.id,
      campaign_id: updated.campaignId,
      expert_id: updated.assignedExpertId ?? requester.sub,
      segment: updated.segment as unknown as CampaignOptimizedPayload['segment'],
      priority: updated.priority as unknown as CampaignOptimizedPayload['priority'],
      conversion_lift: updated.conversionLift,
      sla_breached: updated.slaBreached,
      created_at: updated.createdAt.toISOString(),
      completed_at: completedAt.toISOString(),
    };
    await this.rabbitMq.publish(EventRoutingKey.CAMPAIGN_OPTIMIZED, optimizedPayload);

    return updated;
  }

  async publish(id: string, requester: Requester) {
    // SUPERVISOR/ADMIN only (enforced at controller level) - no ownership restriction.
    return this.transition(id, 'YAYINDA', requester.sub);
  }

  async updateSegment(id: string, requester: Requester, dto: UpdateSegmentDto) {
    const current = await this.getOwnedCase(id, requester);
    const updated = await this.prisma.optimizationCase.update({
      where: { id },
      data: { segment: dto.segment, wasAiClassified: false },
    });

    const payload: CampaignSegmentChangedPayload = {
      case_id: id,
      campaign_id: current.campaignId,
      previous_segment: current.segment as unknown as CampaignSegmentChangedPayload['previous_segment'],
      new_segment: dto.segment as unknown as CampaignSegmentChangedPayload['new_segment'],
      changed_by: requester.sub,
      changed_by_role: requester.role,
      was_ai_assigned: current.wasAiClassified,
    };
    await this.rabbitMq.publish(EventRoutingKey.CAMPAIGN_SEGMENT_CHANGED, payload);

    return updated;
  }

  async updatePriority(id: string, requester: Requester, dto: UpdatePriorityDto) {
    // SUPERVISOR only (enforced at controller level).
    return this.prisma.optimizationCase.update({ where: { id }, data: { priority: dto.priority } });
  }

  async assignExpert(id: string, requester: Requester, dto: AssignExpertDto) {
    // SUPERVISOR only (enforced at controller level) - manual assignment, may
    // apply to a still-YENI case (first assignment) or reassign an ATANDI one.
    const current = await this.prisma.optimizationCase.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Optimizasyon vakası bulunamadı');

    const updated = await this.prisma.optimizationCase.update({
      where: { id },
      data: { assignedExpertId: dto.expertId, assignmentScore: null },
    });

    if (current.status === 'YENI') {
      await this.prisma.optimizationCase.update({ where: { id }, data: { status: 'ATANDI' } });
      await this.prisma.caseStatusHistory.create({
        data: { caseId: id, fromStatus: 'YENI', toStatus: 'ATANDI', changedBy: requester.sub },
      });
    }

    // Publish regardless of previous status so AI Service's expert read-model
    // (active case counts) stays correct on manual reassignment too, not just
    // the automatic AI-driven assignment path in CampaignsService.
    const assignedPayload: CaseAssignedPayload = {
      case_id: id,
      campaign_id: current.campaignId,
      expert_id: dto.expertId,
      segment: current.segment as unknown as CaseAssignedPayload['segment'],
      priority: current.priority as unknown as CaseAssignedPayload['priority'],
      assignment_score: null,
    };
    await this.rabbitMq.publish(EventRoutingKey.CASE_ASSIGNED, assignedPayload);

    return updated;
  }
}
