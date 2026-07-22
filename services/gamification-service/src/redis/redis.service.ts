import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Redis-backed leaderboard (case doc section 6.4: günlük ve haftalık liderlik
 * tablosu). PostgreSQL (UserStats) remains the source of truth for total
 * points/level/badges; Redis sorted sets just give O(log n) ranking for the
 * two rolling windows without re-aggregating the ledger on every read.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit(): void {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  private dailyKey(date = new Date()): string {
    return `leaderboard:daily:${date.toISOString().slice(0, 10)}`;
  }

  private weeklyKey(date = new Date()): string {
    return `leaderboard:weekly:${isoWeekKey(date)}`;
  }

  async recordPoints(userId: string, delta: number): Promise<void> {
    const daily = this.dailyKey();
    const weekly = this.weeklyKey();
    await Promise.all([
      this.client.zincrby(daily, delta, userId),
      this.client.expire(daily, 60 * 60 * 24 * 8),
      this.client.zincrby(weekly, delta, userId),
      this.client.expire(weekly, 60 * 60 * 24 * 15),
    ]);
  }

  async topN(period: 'daily' | 'weekly', n = 10): Promise<{ userId: string; points: number }[]> {
    const key = period === 'daily' ? this.dailyKey() : this.weeklyKey();
    const raw = await this.client.zrevrange(key, 0, n - 1, 'WITHSCORES');
    const result: { userId: string; points: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ userId: raw[i], points: Math.round(Number(raw[i + 1])) });
    }
    return result;
  }

  async rank(period: 'daily' | 'weekly', userId: string): Promise<number | null> {
    const key = period === 'daily' ? this.dailyKey() : this.weeklyKey();
    const rank = await this.client.zrevrank(key, userId);
    return rank === null ? null : rank + 1;
  }
}
