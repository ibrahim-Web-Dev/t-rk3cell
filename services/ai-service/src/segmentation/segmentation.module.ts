import { Module } from '@nestjs/common';
import { SegmentationController } from './segmentation.controller';
import { SegmentationService } from './segmentation.service';
import { RuleBasedClassificationStrategy } from './rule-based-classification.strategy';
import { CLASSIFICATION_STRATEGY } from './segmentation.constants';

@Module({
  controllers: [SegmentationController],
  providers: [
    SegmentationService,
    { provide: CLASSIFICATION_STRATEGY, useClass: RuleBasedClassificationStrategy },
  ],
})
export class SegmentationModule {}
