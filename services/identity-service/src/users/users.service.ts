import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { EventRoutingKey, Role, StaffCreatedPayload } from '@campaigncell/shared-types';
import { Role as PrismaRole } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordPolicyService } from '../common/password-policy';
import { AuthService } from '../auth/auth.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly audit: AuditService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  async createStaff(dto: CreateStaffDto, createdByUserId: string, ip: string | null) {
    this.passwordPolicy.assertValid(dto.password);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kayıtlı');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        role: dto.role,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        specialties: dto.specialties,
        regions: dto.regions,
      },
    });

    const payload: StaffCreatedPayload = {
      user_id: user.id,
      specialties: user.specialties,
      regions: user.regions,
    };
    await this.rabbitMq.publish(EventRoutingKey.STAFF_CREATED, payload);

    await this.audit.record({
      user_id: createdByUserId,
      action: 'staff-created',
      ip,
      result: 'SUCCESS',
      resource_id: user.id,
      detail: `role=${user.role} email=${user.email}`,
    });

    return this.toPublicUser(user);
  }

  async listStaff() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN] } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toPublicUser(u));
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return this.toPublicUser(user);
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
    createdAt: Date;
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
      createdAt: user.createdAt,
    };
  }
}
