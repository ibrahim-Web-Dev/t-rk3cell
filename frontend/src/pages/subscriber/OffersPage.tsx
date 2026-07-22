import { useEffect, useState } from 'react';
import { OfferResponse } from '@campaigncell/shared-types';
import { myOffers, rateOffer, respondOffer } from '../../api/offerApi';
import { apiErrorMessage } from '../../api/client';
import { SubscriberOffer } from '../../types';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { CAMPAIGN_TYPE_LABELS } from '../../shared/labels';
import { useToast } from '../../shared/ToastContext';

export function OffersPage() {
  const [offers, setOffers] = useState<SubscriberOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    setError(null);
    setOffers(null);
    myOffers()
      .then(setOffers)
      .catch((err) => setError(apiErrorMessage(err, 'Teklifler yüklenemedi')));
  }

  useEffect(load, []);

  async function handleRespond(offerId: string, response: OfferResponse) {
    try {
      const updated = await respondOffer(offerId, response);
      setOffers((prev) => prev?.map((o) => (o.id === offerId ? updated : o)) ?? null);
      show('success', response === OfferResponse.KABUL ? 'Teklif kabul edildi' : 'Geri bildiriminiz kaydedildi');
    } catch (err) {
      show('error', apiErrorMessage(err));
    }
  }

  async function handleRate(offerId: string, stars: number) {
    try {
      const updated = await rateOffer(offerId, stars);
      setOffers((prev) => prev?.map((o) => (o.id === offerId ? updated : o)) ?? null);
      show('success', 'Puanınız için teşekkürler');
    } catch (err) {
      show('error', apiErrorMessage(err));
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!offers) return <LoadingSpinner label="Teklifler yükleniyor..." />;
  if (offers.length === 0) return <EmptyState message="Şu anda size özel bir teklif bulunmuyor." />;

  return (
    <div className="grid grid-2">
      {offers.map((offer) => (
        <div className="card" key={offer.id}>
          <h3>{offer.campaign?.title ?? 'Kampanya'}</h3>
          <p style={{ color: 'var(--color-muted)' }}>
            {offer.campaign ? CAMPAIGN_TYPE_LABELS[offer.campaign.type] : ''} · %{offer.campaign?.discountRate} indirim
          </p>
          <p>
            Öneri skoru: <strong>{Math.round(offer.score * 100)}%</strong>
            {offer.score > 0.8 && <span className="badge-pill pill-success" style={{ marginLeft: 8 }}>Öncelikli</span>}
          </p>

          {!offer.response && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-success" onClick={() => handleRespond(offer.id, OfferResponse.KABUL)}>
                Kabul Et
              </button>
              <button className="btn btn-secondary" onClick={() => handleRespond(offer.id, OfferResponse.ILGILENMIYORUM)}>
                İlgilenmiyorum
              </button>
            </div>
          )}

          {offer.response && (
            <p>
              Yanıtınız:{' '}
              <span className={`badge-pill ${offer.response === OfferResponse.KABUL ? 'pill-success' : 'pill-muted'}`}>
                {offer.response === OfferResponse.KABUL ? 'Kabul Edildi' : 'İlgilenmiyorum'}
              </span>
            </p>
          )}

          {offer.response && !offer.satisfactionRatedAt && (
            <div>
              <p style={{ marginBottom: 6 }}>Deneyiminizi puanlayın:</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} className="btn btn-secondary" onClick={() => handleRate(offer.id, star)}>
                    {star}★
                  </button>
                ))}
              </div>
            </div>
          )}

          {offer.satisfactionRatedAt && <p>Puanınız: {offer.satisfactionStars}★</p>}
        </div>
      ))}
    </div>
  );
}
