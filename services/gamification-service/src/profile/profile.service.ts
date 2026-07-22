import { Injectable } from '@nestjs/common';
import { Level } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badges: BadgesService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getProfile(userId: string) {
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    const badges = await this.badges.listForUser(userId);
    const [dailyRank, weeklyRank] = await Promise.all([
      this.leaderboard.rankOf('daily', userId),
      this.leaderboard.rankOf('weekly', userId),
    ]);

    const totalPoints = stats?.totalPoints ?? 0;
    const completedCaseCount = stats?.completedCaseCount ?? 0;

    return {
      userId,
      totalPoints,
      level: (stats?.level as Level) ?? Level.BRONZ,
      completedCaseCount,
      averagePoints: completedCaseCount === 0 ? 0 : Math.round((totalPoints / completedCaseCount) * 10) / 10,
      dailyRank,
      weeklyRank,
      badges: badges.map((b) => ({ badgeCode: b.badgeCode, earnedAt: b.earnedAt })),
    };
  }
}
