import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BadgesModule } from '../badges/badges.module';
import { PointsService } from './points.service';

@Module({
  imports: [RealtimeModule, BadgesModule],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
