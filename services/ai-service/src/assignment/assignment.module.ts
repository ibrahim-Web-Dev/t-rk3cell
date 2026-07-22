import { Module } from '@nestjs/common';
import { ExpertProfileModule } from '../expert-profile/expert-profile.module';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [ExpertProfileModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
