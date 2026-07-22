import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { EventRoutingKey, Role, SubscriberRegisteredPayload } from '@campaigncell/shared-types';
import { RabbitMqService } from '@campaigncell/event-bus';
import { Role as PrismaRole } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordPolicyService } from '../common/password-policy';
import { TokenService, TokenPair } from './token.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { StaffLoginDto } from './dto/staff-login.dto';

const OTP_TTL_MS = 5 * 60 * 1000;
const SIMULATED_OTP_CODE = '1234';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

function normalizeGsm(gsm: string): string {
  const digits = gsm.replace(/\D/g, '');
  return digits.slice(-10);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    const gsm = normalizeGsm(dto.gsm);

    // Registration-status kontrolü SMS gönderilmeden ÖNCE yapılır, böylece
    // kullanıcı OTP ekranını hiç görmeden "kayıtlı değilsiniz"/"zaten
    // kayıtlısınız" bilgisini alır (verifyOtp'de de aynı kontrol tekrar
    // yapılır - defense in depth, ama asıl UX kararı burada verilir).
    const existingUser = await this.prisma.user.findUnique({ where: { gsm } });
    if (dto.intent === 'register' && existingUser) {
      throw new ConflictException('Bu GSM numarası zaten kayıtlı. Giriş yapmayı deneyin.');
    }
    if (dto.intent === 'login' && !existingUser) {
      throw new NotFoundException('Bu numara ile kayıtlı bir hesap bulunamadı. Kayıt olabilirsiniz.');
    }

    await this.prisma.otpCode.create({
      data: {
        gsm,
        code: SIMULATED_OTP_CODE,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    // Simulation only: in production this would trigger an SMS gateway.
    return { message: 'OTP gönderildi (simülasyon: sabit kod 1234)' };
  }

  async verifyOtp(dto: VerifyOtpDto, ip: string | null): Promise<TokenPair & { user: unknown }> {
    const gsm = normalizeGsm(dto.gsm);
    const otp = await this.prisma.otpCode.findFirst({
      where: { gsm, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.code !== dto.code) {
      await this.audit.record({
        user_id: null,
        action: 'subscriber-otp-verify',
        ip,
        result: 'FAILURE',
        detail: `gsm=${gsm}: geçersiz veya süresi dolmuş kod`,
      });
      throw new BadRequestException('Geçersiz veya süresi dolmuş kod');
    }

    let user = await this.prisma.user.findUnique({ where: { gsm } });

    // "intent" tells us whether the user meant to log into an existing
    // account or create a new one - without it, the same GSM could silently
    // register twice (overwriting nothing, but confusing) or a typo'd,
    // never-registered number would fail with a confusing "ad/soyad
    // zorunludur" error instead of a clear "bu numara kayıtlı değil" message.
    if (dto.intent === 'register') {
      if (user) {
        throw new ConflictException('Bu GSM numarası zaten kayıtlı. Giriş yapmayı deneyin.');
      }
      if (!dto.firstName || !dto.lastName) {
        throw new BadRequestException('Kayıt için ad ve soyad zorunludur');
      }
      // E-posta opsiyonel ama unique - başka bir hesapta kullanılıyorsa net bir
      // hata döndür (aksi halde Prisma P2002 ham bir 500'e dönüşürdü).
      if (dto.email) {
        const emailOwner = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (emailOwner) {
          throw new ConflictException('Bu e-posta adresi zaten kullanımda. Farklı bir e-posta deneyin.');
        }
      }
      try {
        user = await this.prisma.user.create({
          data: {
            role: Role.SUBSCRIBER,
            gsm,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
          },
        });
      } catch (err) {
        // GSM/e-posta üzerinde yarış durumu (aynı anda iki kayıt) - unique
        // constraint ihlalini ham 500 yerine anlaşılır bir çakışmaya çevir.
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('Bu GSM veya e-posta zaten kayıtlı. Giriş yapmayı deneyin.');
        }
        throw err;
      }
      const payload: SubscriberRegisteredPayload = { subscriber_id: user.id };
      await this.rabbitMq.publish(EventRoutingKey.SUBSCRIBER_REGISTERED, payload);
    } else if (!user) {
      throw new NotFoundException('Bu numara ile kayıtlı bir hesap bulunamadı. Kayıt olabilirsiniz.');
    }

    // OTP yalnızca burada (tüm doğrulamalar geçtikten sonra) tüketilir - aksi
    // halde bir e-posta/ad-soyad hatası kodu boşa harcar ve kullanıcı yeni
    // kod istemek zorunda kalırdı.
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    const tokenPair = await this.tokens.issueTokenPair(user, ip);
    await this.audit.record({
      user_id: user.id,
      action: 'subscriber-login',
      ip,
      result: 'SUCCESS',
    });

    return { ...tokenPair, user: this.toPublicUser(user) };
  }

  async staffLogin(dto: StaffLoginDto, ip: string | null): Promise<TokenPair & { user: unknown }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.role === Role.SUBSCRIBER || !user.passwordHash) {
      await this.audit.record({
        user_id: null,
        action: 'staff-login',
        ip,
        result: 'FAILURE',
        detail: `email=${dto.email}: kullanıcı bulunamadı`,
      });
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await this.audit.record({
        user_id: user.id,
        action: 'staff-login',
        ip,
        result: 'FAILURE',
        detail: 'hesap kilitli',
      });
      throw new HttpException(
        {
          message: `Hesap kilitli. Kalan süre: ${remainingMinutes} dakika`,
          remainingMinutes,
          lockedUntil: user.lockedUntil.toISOString(),
        },
        423,
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : failedAttempts,
          lockedUntil,
        },
      });
      await this.audit.record({
        user_id: user.id,
        action: 'staff-login',
        ip,
        result: 'FAILURE',
        detail: shouldLock ? 'hesap kilitlendi (5 başarısız deneme)' : 'yanlış şifre',
      });
      if (shouldLock && lockedUntil) {
        throw new HttpException(
          {
            message: `Hesap kilitlendi. Kalan süre: 15 dakika`,
            remainingMinutes: 15,
            lockedUntil: lockedUntil.toISOString(),
          },
          423,
        );
      }
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokenPair = await this.tokens.issueTokenPair(user, ip);
    await this.audit.record({ user_id: user.id, action: 'staff-login', ip, result: 'SUCCESS' });

    return { ...tokenPair, user: this.toPublicUser(user) };
  }

  async refresh(refreshToken: string, ip: string | null): Promise<TokenPair> {
    try {
      const result = await this.tokens.rotateRefreshToken(refreshToken, ip);
      await this.audit.record({
        user_id: result.userId,
        action: 'token-refresh',
        ip,
        result: 'SUCCESS',
      });
      return { accessToken: result.accessToken, refreshToken: result.refreshToken };
    } catch (err) {
      await this.audit.record({
        user_id: null,
        action: 'token-refresh',
        ip,
        result: 'FAILURE',
        detail: (err as Error).message,
      });
      throw err;
    }
  }

  async logout(refreshToken: string, userId: string, ip: string | null): Promise<void> {
    await this.tokens.revokeToken(refreshToken);
    await this.audit.record({ user_id: userId, action: 'logout', ip, result: 'SUCCESS' });
  }

  async assertPasswordPolicy(password: string): Promise<void> {
    this.passwordPolicy.assertValid(password);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  private toPublicUser(user: {
    id: string;
    role: PrismaRole;
    firstName: string | null;
    lastName: string | null;
    gsm: string | null;
    email: string | null;
    specialties: string[];
    regions: string[];
  }) {
    return {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      gsm: user.gsm,
      email: user.email,
      specialties: user.specialties,
      regions: user.regions,
    };
  }
}
