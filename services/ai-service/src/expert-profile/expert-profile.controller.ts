import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { ExpertProfileService } from './expert-profile.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai/experts')
@Roles(Role.SUPERVISOR, Role.ADMIN)
export class ExpertProfileController {
  constructor(private readonly expertProfileService: ExpertProfileService) {}

  @Get()
  findAll() {
    return this.expertProfileService.findAll();
  }
}
