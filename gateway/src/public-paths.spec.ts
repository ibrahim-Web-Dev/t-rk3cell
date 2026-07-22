import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
  it('allows known public auth routes', () => {
    expect(isPublicPath('/api/v1/auth/staff/login')).toBe(true);
    expect(isPublicPath('/api/v1/auth/subscriber/otp/request')).toBe(true);
    expect(isPublicPath('/api/v1/auth/subscriber/otp/verify')).toBe(true);
    expect(isPublicPath('/api/v1/auth/refresh')).toBe(true);
    expect(isPublicPath('/health')).toBe(true);
  });

  it('requires auth for everything else', () => {
    expect(isPublicPath('/api/v1/campaigns')).toBe(false);
    expect(isPublicPath('/api/v1/auth/logout')).toBe(false);
    expect(isPublicPath('/api/v1/users/staff')).toBe(false);
    expect(isPublicPath('/api/v1/game/leaderboard')).toBe(false);
  });
});
