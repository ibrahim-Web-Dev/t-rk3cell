import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '5551234567' })
  @IsString()
  @Matches(/^\+?(90)?5\d{9}$/, { message: 'Geçerli bir Turkcell GSM numarası giriniz (örn: 5551234567)' })
  gsm!: string;

  @ApiProperty({ example: '1234', description: 'Simülasyon: sabit kod 1234' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'OTP kodu 4 haneli olmalıdır' })
  code!: string;

  @ApiProperty({
    example: 'login',
    enum: ['login', 'register'],
    description:
      'Kullanıcının niyeti: "login" mevcut bir hesaba giriş, "register" yeni hesap oluşturma. Bu, aynı GSM ile iki kez kayıt olunmasını veya kayıtsız bir numarayla giriş yapılmaya çalışılmasını ayırt etmek için gereklidir.',
  })
  @IsIn(['login', 'register'])
  intent!: 'login' | 'register';

  @ApiPropertyOptional({ example: 'Ayşe' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Yılmaz' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'ayse@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
