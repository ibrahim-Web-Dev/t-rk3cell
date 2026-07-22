import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
@Roles(Role.SUPERVISOR, Role.ADMIN)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('segment-distribution')
  segmentDistribution() {
    return this.statsService.segmentDistribution();
  }

  @Get('sla-compliance')
  slaCompliance() {
    return this.statsService.slaCompliance();
  }

  @Get('sla-breached-active')
  breachedActiveCases() {
    return this.statsService.breachedActiveCases();
  }

  @Get('conversion-trend')
  conversionTrend(@Query('days') days?: string) {
    return this.statsService.conversionTrend(days ? parseInt(days, 10) : undefined);
  }

  @Get('expert-performance')
  expertPerformance() {
    return this.statsService.expertPerformance();
  }
}
