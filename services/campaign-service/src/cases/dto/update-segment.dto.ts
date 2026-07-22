import { ApiProperty } from '@nestjs/swagger';
import { SegmentType } from '@campaigncell/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateSegmentDto {
  @ApiProperty({ enum: SegmentType })
  @IsEnum(SegmentType)
  segment!: SegmentType;
}
