import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CompleteTestDto {
  @ApiProperty({ example: 0.12, description: 'A/B testi sonucu ölçülen dönüşüm artışı (0-1 arası oran)' })
  @IsNumber()
  conversionLift!: number;
}
