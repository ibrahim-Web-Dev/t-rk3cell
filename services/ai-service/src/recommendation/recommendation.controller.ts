import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { RecommendationService } from './recommendation.service';
import { RecommendRequestDto } from './dto/recommend-request.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  // Requires a valid JWT (no @Public()): reachable through the gateway like
  // any other endpoint. Campaign Service forwards the original caller's
  // Authorization header when it invokes this server-to-server, so the same
  // RBAC/JWT guard protects this endpoint from unauthenticated callers too.
  @Post('recommend')
  recommend(@Body() dto: RecommendRequestDto) {
    return this.recommendationService.recommend(dto);
  }

  @Get('recommend/stats')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  modelSourceStats() {
    return this.recommendationService.modelSourceStats();
  }
}
