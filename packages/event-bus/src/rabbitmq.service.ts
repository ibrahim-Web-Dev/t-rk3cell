import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { RABBITMQ_OPTIONS, RabbitMqModuleOptions } from './rabbitmq.options';

export interface EventEnvelope<TPayload = unknown> {
  event_type: string;
  timestamp: string;
  payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (
  payload: TPayload,
  envelope: EventEnvelope<TPayload>,
) => Promise<void>;

/**
 * Thin wrapper around amqplib giving every service the same publish/subscribe
 * semantics on a shared topic exchange. Each service still defines its own
 * queues, routing key bindings and handlers - this class has no domain logic.
 *
 * Failed messages (handler throws) are nacked without requeue and land on a
 * per-queue dead-letter queue (`<queue>.dlq`) instead of being retried forever
 * or silently dropped.
 */
@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(`RabbitMQ:${this.options.serviceName}`);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly exchange: string;
  private readonly dlx: string;

  constructor(@Inject(RABBITMQ_OPTIONS) private readonly options: RabbitMqModuleOptions) {
    this.exchange = options.exchange ?? 'campaigncell.events';
    this.dlx = `${this.exchange}.dlx`;
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (err) {
      this.logger.warn(`Error while closing RabbitMQ connection: ${(err as Error).message}`);
    }
  }

  private async connectWithRetry(maxAttempts = 15, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.connection = await amqplib.connect(this.options.url);
        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
        await this.channel.assertExchange(this.dlx, 'topic', { durable: true });
        this.connection.on('close', () => {
          this.logger.warn('RabbitMQ connection closed, will reconnect on next publish/subscribe attempt');
        });
        this.logger.log(`Connected to RabbitMQ, exchange "${this.exchange}" ready`);
        return;
      } catch (err) {
        this.logger.warn(
          `RabbitMQ connection attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message}`,
        );
        if (attempt === maxAttempts) {
          this.logger.error('Could not connect to RabbitMQ - service will continue without event bus');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /** Publish a domain event on the shared topic exchange. */
  async publish<TPayload>(routingKey: string, payload: TPayload): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`No channel available, dropping event "${routingKey}"`);
      return;
    }
    const envelope: EventEnvelope<TPayload> = {
      event_type: routingKey,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  /**
   * Declare a durable queue bound to the given routing-key patterns and start
   * consuming it. `queueName` should be unique per (service, purpose), e.g.
   * `gamification.case-completed`.
   */
  async subscribe<TPayload>(
    queueName: string,
    patterns: string[],
    handler: EventHandler<TPayload>,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`No channel available, cannot subscribe queue "${queueName}"`);
      return;
    }
    const dlq = `${queueName}.dlq`;
    await this.channel.assertQueue(dlq, { durable: true });
    await this.channel.bindQueue(dlq, this.dlx, '#');

    await this.channel.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: this.dlx,
    });
    for (const pattern of patterns) {
      await this.channel.bindQueue(queueName, this.exchange, pattern);
    }

    await this.channel.consume(queueName, async (msg) => {
      if (!msg) return;
      try {
        const envelope = JSON.parse(msg.content.toString()) as EventEnvelope<TPayload>;
        await handler(envelope.payload, envelope);
        this.channel!.ack(msg);
      } catch (err) {
        this.logger.error(
          `Handler for queue "${queueName}" failed: ${(err as Error).message}. Routing to DLQ.`,
        );
        this.channel!.nack(msg, false, false);
      }
    });
    this.logger.log(`Subscribed queue "${queueName}" to patterns [${patterns.join(', ')}]`);
  }
}
