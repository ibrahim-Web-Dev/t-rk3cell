import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@campaigncell/shared-types';
import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsString } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'uzman1@campaigncell.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password1!' })
  @IsString()
  password!: string;

  @ApiProperty({ example: 'Mehmet' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Demir' })
  @IsString()
  lastName!: string;

  @ApiProperty({ enum: [Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN], example: Role.PERSONEL })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ example: ['RISKLI_KAYIP', 'YUKSEK_DEGER'], description: 'Uzmanlık alanları (segment türleri)' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  specialties!: string[];

  @ApiProperty({ example: ['MARMARA', 'EGE'], description: 'Sorumlu bölgeler' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  regions!: string[];
}
