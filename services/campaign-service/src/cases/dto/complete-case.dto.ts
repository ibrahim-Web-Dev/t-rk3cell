import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteCaseDto {
  @ApiProperty({ example: 'Segment yeniden hedeflendi, indirim oranı %5 artırıldı.' })
  @IsString()
  @MinLength(5, { message: 'Optimizasyon notu zorunludur ve en az 5 karakter olmalıdır' })
  optimizationNote!: string;

  @ApiPropertyOptional({ example: 0.18, description: 'Dönüşüm artışı (0-1 arası oran)' })
  @IsOptional()
  @IsNumber()
  conversionLift?: number;
}
