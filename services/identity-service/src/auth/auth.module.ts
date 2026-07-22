import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PasswordPolicyService } from '../common/password-policy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, PasswordPolicyService],
  exports: [AuthService, TokenService, PasswordPolicyService],
})
export class AuthModule {}
