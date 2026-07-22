import { Module } from '@nestjs/common';
import { RabbitMqModule } from '@campaigncell/event-bus';

@Module({
  imports: [
    RabbitMqModule.forRoot({
      url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
      serviceName: 'identity-service',
    }),
  ],
})
export class EventBusModule {}
