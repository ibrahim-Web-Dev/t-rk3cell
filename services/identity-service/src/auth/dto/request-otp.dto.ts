import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '5551234567', description: 'Kabul edilen biçimler: 5XXXXXXXXX, 05XXXXXXXXX, 905XXXXXXXXX, +905XXXXXXXXX' })
  @IsString()
  @Matches(/^(0|\+?90)?5\d{9}$/, {
    message: 'Geçerli bir Turkcell GSM numarası giriniz (örn: 5551234567 veya 05551234567)',
  })
  gsm!: string;

  @ApiProperty({
    example: 'login',
    enum: ['login', 'register'],
    description:
      'Kullanıcının niyeti - bu sayede "kayıtlı değilsiniz" / "zaten kayıtlısınız" durumu SMS gönderilmeden ÖNCE tespit edilip bildirilir.',
  })
  @IsIn(['login', 'register'])
  intent!: 'login' | 'register';
}
