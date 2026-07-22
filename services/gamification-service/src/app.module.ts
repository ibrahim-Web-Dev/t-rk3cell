import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '@campaigncell/auth-kit';
import { AllExceptionsFilter, ResponseInterceptor } from '@campaigncell/common-kit';
import { RabbitMqService } from '@campaigncell/event-bus';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { RealtimeModule } from './realtime/realtime.module';
import { BadgesModule } from './badges/badges.module';
import { PointsModule } from './points/points.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    RedisModule,
    EventBusModule,
    RealtimeModule,
    BadgesModule,
    PointsModule,
    LeaderboardModule,
    ProfileModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    {
      provide: APP_FILTER,
      useFactory: (rabbitMq: RabbitMqService) => new AllExceptionsFilter(rabbitMq, 'gamification-service'),
      inject: [RabbitMqService],
    },
  ],
})
export class AppModule {}
