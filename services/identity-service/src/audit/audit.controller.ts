import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { AuditService } from './audit.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query('limit') limit?: string) {
    return this.auditService.findAll(limit ? parseInt(limit, 10) : undefined);
  }
}
