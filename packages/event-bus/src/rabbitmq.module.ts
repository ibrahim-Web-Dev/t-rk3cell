import { DynamicModule, Global, Module } from '@nestjs/common';
import { RABBITMQ_OPTIONS, RabbitMqModuleOptions } from './rabbitmq.options';
import { RabbitMqService } from './rabbitmq.service';

@Global()
@Module({})
export class RabbitMqModule {
  static forRoot(options: RabbitMqModuleOptions): DynamicModule {
    return {
      module: RabbitMqModule,
      providers: [
        { provide: RABBITMQ_OPTIONS, useValue: options },
        RabbitMqService,
      ],
      exports: [RabbitMqService],
    };
  }
}
