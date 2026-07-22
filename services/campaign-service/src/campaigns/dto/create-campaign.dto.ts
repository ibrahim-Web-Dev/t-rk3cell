import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType, SegmentType } from '@campaigncell/shared-types';
import { ArrayUnique, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Yaz Sonu Ek Paket Kampanyası' })
  @IsString()
  title!: string;

  @ApiProperty({ enum: CampaignType, example: CampaignType.EK_PAKET })
  @IsEnum(CampaignType)
  type!: CampaignType;

  @ApiPropertyOptional({
    enum: SegmentType,
    description: 'Kampanyayı oluştururken uzmanın öngördüğü hedef segment (AI kendi sınıflandırmasını ayrıca yapar)',
  })
  @IsOptional()
  @IsEnum(SegmentType)
  targetSegmentHint?: SegmentType;

  @ApiProperty({ example: 20, description: 'İndirim oranı (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate!: number;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  validUntil!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Hedeflenen abone id listesi (Identity Service üzerinden alınır); her biri için AI önerisi üretilir',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  targetSubscriberIds?: string[];
}
