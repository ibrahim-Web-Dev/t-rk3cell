import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min } from 'class-validator';

export class RecommendRequestDto {
  @ApiProperty()
  @IsString()
  campaignId!: string;

  @ApiProperty()
  @IsString()
  subscriberId!: string;

  @ApiProperty({ example: 'EK_PAKET' })
  @IsString()
  campaignType!: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate!: number;
}
