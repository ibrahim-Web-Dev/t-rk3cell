import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { EventRoutingKey, Role, StaffCreatedPayload, StaffUpdatedPayload } from '@campaigncell/shared-types';
import { Role as PrismaRole } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordPolicyService } from '../common/password-policy';
import { AuthService } from '../auth/auth.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

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

  /**
   * Minimal, düşük-yetkili "kim kim" dizini: yalnızca isim, e-posta/GSM/
   * uzmanlık gibi hassas alanlar YOK. `GET /users/staff` (tam detay) hâlâ
   * SUPERVISOR/ADMIN'e özel; bu uç nokta ise liderlik tablosu/atanan uzman
   * gibi ekranlarda PERSONEL'in de diğer personelin adını görebilmesi için
   * (aksi halde UUID'ler gösterilir - demo seed ID'leri hepsi aynı
   * "00000000-..." önekiyle başladığından bu, tüm kullanıcıların aynı
   * görünmesine yol açar).
   */
  async staffDirectory() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN] } },
      select: { id: true, firstName: true, lastName: true },
    });
    return users;
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return this.toPublicUser(user);
  }

  /**
   * Kullanıcı rol değişikliği (case doc 3.4: "Rol değişiklikleri" audit'e
   * yazılmalı). Yalnızca ADMIN (controller seviyesinde). Aboneler personel
   * rolüne bu uçtan yükseltilemez (abonelerin şifresi yoktur, personel girişi
   * yapamazlar) ve admin kendi rolünü düşüremez (kilitlenme riski).
   */
  async updateRole(targetUserId: string, dto: UpdateRoleDto, actorUserId: string, ip: string | null) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');

    if (target.role === Role.SUBSCRIBER) {
      throw new BadRequestException('Abone hesapları personel rolüne yükseltilemez');
    }
    if (targetUserId === actorUserId && dto.role !== Role.ADMIN) {
      throw new ForbiddenException('Kendi admin rolünüzü düşüremezsiniz');
    }

    const previousRole = target.role;
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
    });

    // AI Service'in uzman read-model'i staff.updated event'iyle senkron kalır.
    const payload: StaffUpdatedPayload = {
      user_id: updated.id,
      specialties: updated.specialties,
      regions: updated.regions,
    };
    await this.rabbitMq.publish(EventRoutingKey.STAFF_UPDATED, payload);

    await this.audit.record({
      user_id: actorUserId,
      action: 'role-changed',
      ip,
      result: 'SUCCESS',
      resource_id: targetUserId,
      detail: `Rol değişikliği: ${previousRole} -> ${dto.role}`,
    });

    return this.toPublicUser(updated);
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
