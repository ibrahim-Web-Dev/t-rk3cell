import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { RuleBasedScoringStrategy } from './rule-based-scoring.strategy';
import { SCORING_STRATEGY } from './recommendation.constants';

@Module({
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    { provide: SCORING_STRATEGY, useClass: RuleBasedScoringStrategy },
  ],
})
export class RecommendationModule {}
