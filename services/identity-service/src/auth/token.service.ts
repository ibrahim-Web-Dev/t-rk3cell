import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { User } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  private get secret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET tanımlı değil');
    return secret;
  }

  signAccessToken(user: Pick<User, 'id' | 'role' | 'specialties' | 'regions'>): string {
    return jwt.sign(
      { sub: user.id, role: user.role, specialties: user.specialties, regions: user.regions },
      this.secret,
      { expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOpaqueToken(): string {
    return randomBytes(48).toString('hex');
  }

  async issueTokenPair(user: User, ip: string | null): Promise<TokenPair> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.generateOpaqueToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        createdByIp: ip,
      },
    });
    return { accessToken, refreshToken };
  }

  /**
   * Rotates a refresh token. If the presented token was already revoked
   * (i.e. someone is replaying a stolen/rotated-out token), every active
   * session for that user is revoked immediately (token theft protection).
   */
  async rotateRefreshToken(rawToken: string, ip: string | null): Promise<TokenPair & { userId: string }> {
    const tokenHash = this.hash(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record) {
      throw new UnauthorizedException('Geçersiz refresh token');
    }
    if (record.revoked) {
      await this.revokeAllForUser(record.userId);
      throw new UnauthorizedException(
        'Token güvenlik ihlali tespit edildi, tüm oturumlar sonlandırıldı',
      );
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token süresi dolmuş');
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif');
    }

    const newRefreshToken = this.generateOpaqueToken();
    const newHash = this.hash(newRefreshToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revoked: true, replacedByTokenHash: newHash },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newHash,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
          createdByIp: ip,
        },
      }),
    ]);

    return {
      accessToken: this.signAccessToken(user),
      refreshToken: newRefreshToken,
      userId: user.id,
    };
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async revokeToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken) },
      data: { revoked: true },
    });
  }
}
