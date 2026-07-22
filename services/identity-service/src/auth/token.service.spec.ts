import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';

process.env.JWT_SECRET = 'test-secret';

function makePrismaMock() {
  const refreshTokens = new Map<string, any>();
  return {
    refreshToken: {
      create: jest.fn(async ({ data }: any) => {
        const record = { id: `rt-${refreshTokens.size + 1}`, revoked: false, ...data };
        refreshTokens.set(data.tokenHash, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where: { tokenHash } }: any) => refreshTokens.get(tokenHash) ?? null),
      update: jest.fn(async ({ where: { id }, data }: any) => {
        for (const record of refreshTokens.values()) {
          if (record.id === id) Object.assign(record, data);
        }
        return data;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        for (const record of refreshTokens.values()) {
          if (!where.userId || record.userId === where.userId) Object.assign(record, data);
        }
        return { count: 1 };
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where: { id } }: any) =>
        id === 'user-1' ? { id: 'user-1', role: 'PERSONEL', specialties: [], regions: [], isActive: true } : null,
      ),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('TokenService', () => {
  it('issues an access + refresh token pair', async () => {
    const prisma = makePrismaMock();
    const service = new TokenService(prisma as any);
    const user = { id: 'user-1', role: 'PERSONEL', specialties: [], regions: [] } as any;

    const pair = await service.issueTokenPair(user, '127.0.0.1');
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toHaveLength(96);
  });

  it('rotates a valid refresh token and revokes the old one', async () => {
    const prisma = makePrismaMock();
    const service = new TokenService(prisma as any);
    const user = { id: 'user-1', role: 'PERSONEL', specialties: [], regions: [] } as any;

    const first = await service.issueTokenPair(user, '127.0.0.1');
    const rotated = await service.rotateRefreshToken(first.refreshToken, '127.0.0.1');

    expect(rotated.refreshToken).not.toEqual(first.refreshToken);
    await expect(service.rotateRefreshToken(first.refreshToken, '127.0.0.1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokes all sessions when a revoked refresh token is replayed (theft protection)', async () => {
    const prisma = makePrismaMock();
    const service = new TokenService(prisma as any);
    const user = { id: 'user-1', role: 'PERSONEL', specialties: [], regions: [] } as any;

    const first = await service.issueTokenPair(user, '127.0.0.1');
    await service.rotateRefreshToken(first.refreshToken, '127.0.0.1');

    // Replaying the already-rotated (now revoked) token must fail...
    await expect(service.rotateRefreshToken(first.refreshToken, '127.0.0.1')).rejects.toThrow(
      UnauthorizedException,
    );
    // ...and revokeAllForUser must have been triggered.
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revoked: false } }),
    );
  });
});
