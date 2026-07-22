import { PasswordPolicyService } from './password-policy';

describe('PasswordPolicyService', () => {
  const service = new PasswordPolicyService();

  it('kabul eder: tüm kurallara uyan şifre', () => {
    expect(() => service.assertValid('Password1!')).not.toThrow();
  });

  it('reddeder: 8 karakterden kısa şifre', () => {
    expect(() => service.assertValid('Pw1!')).toThrow(/en az 8 karakter/);
  });

  it('reddeder: büyük harf içermeyen şifre', () => {
    expect(() => service.assertValid('password1!')).toThrow(/büyük harf/);
  });

  it('reddeder: rakam içermeyen şifre', () => {
    expect(() => service.assertValid('Password!')).toThrow(/rakam/);
  });

  it('reddeder: özel karakter içermeyen şifre', () => {
    expect(() => service.assertValid('Password1')).toThrow(/özel karakter/);
  });

  it('birden fazla ihlali aynı anda raporlar', () => {
    expect.assertions(1);
    try {
      service.assertValid('short');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toEqual(
        expect.stringContaining('8 karakter'),
      );
    }
  });
});
