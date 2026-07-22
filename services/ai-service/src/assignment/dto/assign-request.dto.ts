import { ApiProperty } from '@nestjs/swagger';
import { Priority, SegmentType } from '@campaigncell/shared-types';
import { IsEnum, IsString } from 'class-validator';

export class AssignRequestDto {
  @ApiProperty()
  @IsString()
  caseId!: string;

  @ApiProperty({ enum: SegmentType })
  @IsEnum(SegmentType)
  segment!: SegmentType;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;
}
