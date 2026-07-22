import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignExpertDto {
  @ApiProperty({ description: 'Identity Service kullanıcı id (personel)' })
  @IsString()
  expertId!: string;
}
