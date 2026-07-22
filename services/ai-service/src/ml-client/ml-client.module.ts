import { Module } from '@nestjs/common';
import { MlChurnClient } from './ml-churn.client';

@Module({
  providers: [MlChurnClient],
  exports: [MlChurnClient],
})
export class MlClientModule {}
