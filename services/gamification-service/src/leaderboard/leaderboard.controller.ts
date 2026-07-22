import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('game')
@ApiBearerAuth()
@Controller('game/leaderboard')
@Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly'], required: false })
  top(@Query('period') period = 'daily') {
    if (period !== 'daily' && period !== 'weekly') {
      throw new BadRequestException('period sadece "daily" veya "weekly" olabilir');
    }
    return this.leaderboardService.top(period);
  }
}
