import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { SlaScheduler } from './sla.scheduler';

@Module({
  controllers: [CasesController],
  providers: [CasesService, SlaScheduler],
  exports: [CasesService],
})
export class CasesModule {}
