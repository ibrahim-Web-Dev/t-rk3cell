import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Password policy (case doc section 3.1): min 8 chars, at least 1 uppercase,
 * 1 digit, 1 special character. Every violated rule is reported individually
 * so the caller gets a precise, actionable error message.
 */
@Injectable()
export class PasswordPolicyService {
  assertValid(password: string): void {
    const violations: string[] = [];

    if (!password || password.length < 8) {
      violations.push('Şifre en az 8 karakter olmalıdır.');
    }
    if (!/[A-Z]/.test(password ?? '')) {
      violations.push('Şifre en az 1 büyük harf içermelidir.');
    }
    if (!/[0-9]/.test(password ?? '')) {
      violations.push('Şifre en az 1 rakam içermelidir.');
    }
    if (!/[^A-Za-z0-9]/.test(password ?? '')) {
      violations.push('Şifre en az 1 özel karakter içermelidir.');
    }

    if (violations.length > 0) {
      throw new BadRequestException(violations.join(' '));
    }
  }
}
