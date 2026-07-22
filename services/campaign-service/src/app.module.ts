import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '@campaigncell/auth-kit';
import { AllExceptionsFilter, ResponseInterceptor } from '@campaigncell/common-kit';
import { RabbitMqService } from '@campaigncell/event-bus';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CasesModule } from './cases/cases.module';
import { OffersModule } from './offers/offers.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    CommonModule,
    EventBusModule,
    CampaignsModule,
    CasesModule,
    OffersModule,
    StatsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    {
      provide: APP_FILTER,
      useFactory: (rabbitMq: RabbitMqService) => new AllExceptionsFilter(rabbitMq, 'campaign-service'),
      inject: [RabbitMqService],
    },
  ],
})
export class AppModule {}
