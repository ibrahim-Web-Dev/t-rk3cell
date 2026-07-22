import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(Role.PERSONEL)
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') authorization: string,
  ) {
    return this.campaignsService.create(dto, user.sub, authorization);
  }

  @Get()
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.campaignsService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.campaignsService.findOne(id, user);
  }
}
