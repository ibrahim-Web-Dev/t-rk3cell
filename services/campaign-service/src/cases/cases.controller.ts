import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload, Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { CasesService } from './cases.service';
import { CompleteCaseDto } from './dto/complete-case.dto';
import { CompleteTestDto } from './dto/complete-test.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { AssignExpertDto } from './dto/assign-expert.dto';

@ApiTags('cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.casesService.findAll(user);
  }

  @Get('queue/pending')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  findPendingQueue() {
    return this.casesService.findPendingQueue();
  }

  @Get(':id')
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.casesService.findOne(id, user);
  }

  @Get(':id/history')
  @Roles(Role.PERSONEL, Role.SUPERVISOR, Role.ADMIN)
  findHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.casesService.findHistory(id, user);
  }

  @Patch(':id/start')
  @Roles(Role.PERSONEL)
  start(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.casesService.start(id, user);
  }

  @Patch(':id/start-test')
  @Roles(Role.PERSONEL)
  startTest(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.casesService.startTest(id, user);
  }

  @Patch(':id/complete-test')
  @Roles(Role.PERSONEL)
  completeTest(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CompleteTestDto) {
    return this.casesService.completeTest(id, user, dto);
  }

  @Patch(':id/complete')
  @Roles(Role.PERSONEL)
  complete(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CompleteCaseDto) {
    return this.casesService.complete(id, user, dto);
  }

  @Patch(':id/publish')
  @Roles(Role.SUPERVISOR)
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.casesService.publish(id, user);
  }

  @Patch(':id/segment')
  @Roles(Role.PERSONEL, Role.SUPERVISOR)
  updateSegment(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateSegmentDto) {
    return this.casesService.updateSegment(id, user, dto);
  }

  @Patch(':id/priority')
  @Roles(Role.SUPERVISOR)
  updatePriority(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdatePriorityDto) {
    return this.casesService.updatePriority(id, user, dto);
  }

  @Patch(':id/assign')
  @Roles(Role.SUPERVISOR)
  assign(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: AssignExpertDto) {
    return this.casesService.assignExpert(id, user, dto);
  }
}
