import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly redis: RedisService) {}

  async top(period: 'daily' | 'weekly') {
    const entries = await this.redis.topN(period, 10);
    return entries.map((entry, index) => ({ rank: index + 1, ...entry }));
  }

  async rankOf(period: 'daily' | 'weekly', userId: string) {
    return this.redis.rank(period, userId);
  }
}
