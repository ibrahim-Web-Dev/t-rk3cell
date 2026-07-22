import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { RuleBasedScoringStrategy } from './rule-based-scoring.strategy';
import { MlScoringStrategy } from './ml-scoring.strategy';
import { SCORING_STRATEGY } from './recommendation.constants';
import { MlClientModule } from '../ml-client/ml-client.module';

@Module({
  imports: [MlClientModule],
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    RuleBasedScoringStrategy,
    MlScoringStrategy,
    {
      // AI_SCORING_STRATEGY=rule ile gerçek modeli devre dışı bırakıp saf
      // kural tabanlı stratejiye dönmek mümkün (demo/debug amaçlı) - bkz.
      // ai-service README. Varsayılan: gerçek ML modeli (ml).
      provide: SCORING_STRATEGY,
      useFactory: (ml: MlScoringStrategy, rule: RuleBasedScoringStrategy) =>
        process.env.AI_SCORING_STRATEGY === 'rule' ? rule : ml,
      inject: [MlScoringStrategy, RuleBasedScoringStrategy],
    },
  ],
})
export class RecommendationModule {}
