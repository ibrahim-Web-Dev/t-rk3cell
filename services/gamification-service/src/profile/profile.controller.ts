import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { ProfileService } from './profile.service';

@ApiTags('game')
@ApiBearerAuth()
@Controller('game/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  me(@CurrentUser() user: JwtPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Get(':userId')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  byId(@Param('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }
}
