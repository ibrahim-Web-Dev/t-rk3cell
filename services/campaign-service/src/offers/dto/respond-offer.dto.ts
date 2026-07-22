import { ApiProperty } from '@nestjs/swagger';
import { OfferResponse } from '@campaigncell/shared-types';
import { IsEnum } from 'class-validator';

export class RespondOfferDto {
  @ApiProperty({ enum: OfferResponse })
  @IsEnum(OfferResponse)
  response!: OfferResponse;
}
