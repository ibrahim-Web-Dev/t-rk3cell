import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@campaigncell/shared-types';

export class UpdateRoleDto {
  @ApiProperty({ enum: [Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN], example: Role.SUPERVISOR })
  @IsEnum(Role)
  role!: Role;
}
