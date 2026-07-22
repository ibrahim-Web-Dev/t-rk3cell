export const RABBITMQ_OPTIONS = 'RABBITMQ_OPTIONS';

export interface RabbitMqModuleOptions {
  /** amqp connection url, e.g. amqp://user:pass@rabbitmq:5672 */
  url: string;
  /** Name of the calling service, used to prefix queue names and for logging. */
  serviceName: string;
  /** Topic exchange all CampaignCell events are published to. Defaults to 'campaigncell.events'. */
  exchange?: string;
}
