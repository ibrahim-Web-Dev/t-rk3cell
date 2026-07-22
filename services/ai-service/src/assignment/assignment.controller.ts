import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { AssignRequestDto } from './dto/assign-request.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('assign')
  assign(@Body() dto: AssignRequestDto) {
    return this.assignmentService.assign(dto);
  }
}
