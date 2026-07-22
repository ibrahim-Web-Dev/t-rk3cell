import { OfferResponse } from '@campaigncell/shared-types';
import { apiClient, unwrap } from './client';
import { SubscriberOffer } from '../types';

export function myOffers() {
  return unwrap<SubscriberOffer[]>(apiClient.get('/subscribers/offers/mine'));
}

export function respondOffer(id: string, response: OfferResponse) {
  return unwrap<SubscriberOffer>(apiClient.patch(`/subscribers/offers/${id}/respond`, { response }));
}

export function rateOffer(id: string, stars: number) {
  return unwrap<SubscriberOffer>(apiClient.patch(`/subscribers/offers/${id}/rate`, { stars }));
}
