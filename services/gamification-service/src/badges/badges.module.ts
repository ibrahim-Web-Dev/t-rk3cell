import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BadgesService } from './badges.service';

@Module({
  imports: [RealtimeModule],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
