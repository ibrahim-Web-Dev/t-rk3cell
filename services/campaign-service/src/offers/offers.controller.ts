import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { OffersService } from './offers.service';
import { RespondOfferDto } from './dto/respond-offer.dto';
import { RateOfferDto } from './dto/rate-offer.dto';

@ApiTags('offers')
@ApiBearerAuth()
@Controller('subscribers/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get('mine')
  @Roles(Role.SUBSCRIBER)
  mine(@CurrentUser() user: JwtPayload) {
    return this.offersService.listForSubscriber(user.sub);
  }

  @Patch(':id/respond')
  @Roles(Role.SUBSCRIBER)
  respond(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: RespondOfferDto) {
    return this.offersService.respond(id, user.sub, dto);
  }

  @Patch(':id/rate')
  @Roles(Role.SUBSCRIBER)
  rate(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: RateOfferDto) {
    return this.offersService.rate(id, user.sub, dto);
  }
}
