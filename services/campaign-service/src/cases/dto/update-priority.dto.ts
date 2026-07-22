import { ApiProperty } from '@nestjs/swagger';
import { Priority } from '@campaigncell/shared-types';
import { IsEnum } from 'class-validator';

export class UpdatePriorityDto {
  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;
}
