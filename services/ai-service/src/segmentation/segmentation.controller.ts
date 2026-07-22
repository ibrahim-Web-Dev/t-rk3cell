import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@campaigncell/auth-kit';
import { Role } from '@campaigncell/shared-types';
import { SegmentationService } from './segmentation.service';
import { ClassifyRequestDto } from './dto/classify-request.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class SegmentationController {
  constructor(private readonly segmentationService: SegmentationService) {}

  @Post('classify')
  classify(@Body() dto: ClassifyRequestDto) {
    return this.segmentationService.classify(dto);
  }

  @Get('accuracy')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  accuracyOverall() {
    return this.segmentationService.accuracyOverall();
  }

  @Get('accuracy/by-category')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  accuracyByCategory() {
    return this.segmentationService.accuracyByCategory();
  }
}
