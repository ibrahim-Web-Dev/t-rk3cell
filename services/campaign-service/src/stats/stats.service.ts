import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async segmentDistribution() {
    const cases = await this.prisma.optimizationCase.findMany({ select: { segment: true } });
    const counts: Record<string, number> = {};
    for (const c of cases) counts[c.segment] = (counts[c.segment] ?? 0) + 1;
    return Object.entries(counts).map(([segment, count]) => ({ segment, count }));
  }

  async slaCompliance() {
    const total = await this.prisma.optimizationCase.count();
    const breached = await this.prisma.optimizationCase.count({ where: { slaBreached: true } });
    const compliant = total - breached;
    return {
      total,
      breached,
      compliant,
      complianceRate: total === 0 ? 100 : Math.round((compliant / total) * 1000) / 10,
    };
  }

  async breachedActiveCases() {
    return this.prisma.optimizationCase.findMany({
      where: { slaBreached: true, status: { notIn: ['TAMAMLANDI', 'YAYINDA', 'ARSIVLENDI'] } },
      include: { campaign: true },
      orderBy: { slaDueAt: 'asc' },
    });
  }

  async conversionTrend(days = 14) {
    const since = new Date(Date.now() - days * 86_400_000);
    const offers = await this.prisma.subscriberOffer.findMany({
      where: { respondedAt: { gte: since } },
      select: { respondedAt: true, response: true },
    });
    const byDay = new Map<string, { total: number; accepted: number }>();
    for (const offer of offers) {
      const day = offer.respondedAt!.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? { total: 0, accepted: 0 };
      bucket.total += 1;
      if (offer.response === 'KABUL') bucket.accepted += 1;
      byDay.set(day, bucket);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, { total, accepted }]) => ({
        day,
        total,
        accepted,
        conversionRate: total === 0 ? 0 : Math.round((accepted / total) * 1000) / 10,
      }));
  }

  async expertPerformance() {
    const completedCases = await this.prisma.optimizationCase.findMany({
      where: { assignedExpertId: { not: null }, completedAt: { not: null } },
    });
    const byExpert = new Map<
      string,
      { completedCount: number; totalLift: number; liftCount: number; totalDurationMs: number }
    >();
    for (const c of completedCases) {
      const key = c.assignedExpertId!;
      const bucket = byExpert.get(key) ?? { completedCount: 0, totalLift: 0, liftCount: 0, totalDurationMs: 0 };
      bucket.completedCount += 1;
      if (c.conversionLift != null) {
        bucket.totalLift += c.conversionLift;
        bucket.liftCount += 1;
      }
      bucket.totalDurationMs += c.completedAt!.getTime() - c.createdAt.getTime();
      byExpert.set(key, bucket);
    }
    return Array.from(byExpert.entries()).map(([expertId, b]) => ({
      expertId,
      completedCount: b.completedCount,
      averageConversionLift: b.liftCount === 0 ? null : Math.round((b.totalLift / b.liftCount) * 1000) / 1000,
      averageDurationHours: Math.round((b.totalDurationMs / b.completedCount / 3_600_000) * 10) / 10,
    }));
  }
}
