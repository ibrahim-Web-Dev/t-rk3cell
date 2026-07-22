import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [BadgesModule, LeaderboardModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
