import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RabbitMqService } from '@campaigncell/event-bus';
import { EventRoutingKey, OfferRespondedPayload, SatisfactionRatedPayload } from '@campaigncell/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RespondOfferDto } from './dto/respond-offer.dto';
import { RateOfferDto } from './dto/rate-offer.dto';

const MIN_VISIBLE_SCORE = 0.6;

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService, private readonly rabbitMq: RabbitMqService) {}

  async listForSubscriber(subscriberId: string) {
    return this.prisma.subscriberOffer.findMany({
      where: { subscriberId, score: { gte: MIN_VISIBLE_SCORE } },
      include: { campaign: true },
      orderBy: { score: 'desc' },
    });
  }

  private async getOwnedOffer(id: string, subscriberId: string) {
    const offer = await this.prisma.subscriberOffer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');
    if (offer.subscriberId !== subscriberId) {
      throw new ForbiddenException('Başka bir abonenin teklifine erişemezsiniz');
    }
    return offer;
  }

  async respond(id: string, subscriberId: string, dto: RespondOfferDto) {
    const offer = await this.getOwnedOffer(id, subscriberId);
    const updated = await this.prisma.subscriberOffer.update({
      where: { id: offer.id },
      data: { response: dto.response, respondedAt: new Date() },
    });

    const payload: OfferRespondedPayload = {
      campaign_id: offer.campaignId,
      subscriber_id: subscriberId,
      response: dto.response,
    };
    await this.rabbitMq.publish(EventRoutingKey.OFFER_RESPONDED, payload);

    return updated;
  }

  async rate(id: string, subscriberId: string, dto: RateOfferDto) {
    const offer = await this.getOwnedOffer(id, subscriberId);
    if (!offer.response) {
      throw new BadRequestException('Önce teklife yanıt vermelisiniz');
    }
    if (offer.satisfactionRatedAt) {
      throw new BadRequestException('Bu teklif için daha önce puan verdiniz');
    }

    const updated = await this.prisma.subscriberOffer.update({
      where: { id: offer.id },
      data: { satisfactionStars: dto.stars, satisfactionRatedAt: new Date() },
    });

    const payload: SatisfactionRatedPayload = {
      campaign_id: offer.campaignId,
      subscriber_id: subscriberId,
      stars: dto.stars,
    };
    await this.rabbitMq.publish(EventRoutingKey.SATISFACTION_RATED, payload);

    return updated;
  }
}
