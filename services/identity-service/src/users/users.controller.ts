import { Body, Controller, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, JwtPayload, Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.getById(user.sub);
  }

  @Post('staff')
  @Roles(Role.ADMIN)
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? null;
    return this.usersService.createStaff(dto, user.sub, ip);
  }

  @Get('staff')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  listStaff() {
    return this.usersService.listStaff();
  }

  @Get('staff-directory')
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  staffDirectory() {
    return this.usersService.staffDirectory();
  }

  @Get(':id')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    // IDOR guard: even with SUPERVISOR/ADMIN role required above, keep an
    // explicit ownership escape hatch documented for future roles instead of
    // silently trusting the path parameter.
    if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN && user.sub !== id) {
      throw new ForbiddenException('Başka bir kullanıcının kaydına erişemezsiniz');
    }
    return this.usersService.getById(id);
  }
}
