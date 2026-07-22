import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SegmentType } from '@campaigncell/shared-types';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ClassifyRequestDto {
  @ApiProperty()
  @IsString()
  campaignId!: string;

  @ApiProperty()
  @IsString()
  campaignNumber!: string;

  @ApiProperty({ example: 'EK_PAKET' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ enum: SegmentType })
  @IsOptional()
  @IsEnum(SegmentType)
  targetSegmentHint?: SegmentType | null;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate!: number;
}
