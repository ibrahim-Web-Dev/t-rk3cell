import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '@campaigncell/auth-kit';
import { AllExceptionsFilter, ResponseInterceptor } from '@campaigncell/common-kit';
import { RabbitMqService } from '@campaigncell/event-bus';
import { PrismaModule } from './prisma/prisma.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { SegmentationModule } from './segmentation/segmentation.module';
import { AssignmentModule } from './assignment/assignment.module';
import { ExpertProfileModule } from './expert-profile/expert-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    EventBusModule,
    ExpertProfileModule,
    RecommendationModule,
    SegmentationModule,
    AssignmentModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    {
      provide: APP_FILTER,
      useFactory: (rabbitMq: RabbitMqService) => new AllExceptionsFilter(rabbitMq, 'ai-service'),
      inject: [RabbitMqService],
    },
  ],
})
export class AppModule {}
