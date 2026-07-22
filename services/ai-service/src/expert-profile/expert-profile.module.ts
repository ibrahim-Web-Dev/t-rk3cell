import { Module } from '@nestjs/common';
import { ExpertProfileController } from './expert-profile.controller';
import { ExpertProfileService } from './expert-profile.service';

@Module({
  controllers: [ExpertProfileController],
  providers: [ExpertProfileService],
  exports: [ExpertProfileService],
})
export class ExpertProfileModule {}
