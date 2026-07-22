import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CampaignType, SegmentType } from '@campaigncell/shared-types';
import { createCampaign } from '../../api/campaignApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../shared/ToastContext';
import { CAMPAIGN_TYPE_LABELS, SEGMENT_LABELS } from '../../shared/labels';

export function NewCampaignPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CampaignType>(CampaignType.EK_PAKET);
  const [targetSegmentHint, setTargetSegmentHint] = useState<SegmentType | ''>('');
  const [discountRate, setDiscountRate] = useState(20);
  const [validUntil, setValidUntil] = useState('');
  const [subscriberIds, setSubscriberIds] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const campaign = await createCampaign({
        title,
        type,
        targetSegmentHint: targetSegmentHint || undefined,
        discountRate,
        validUntil: new Date(validUntil).toISOString(),
        targetSubscriberIds: subscriberIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (campaign.optimizationCase) {
        show(
          'success',
          `Kampanya oluşturuldu (${campaign.campaignNumber}) — AI dönüşüm tahminini düşük buldu, optimizasyon vakası açıldı.`,
        );
      } else {
        show(
          'success',
          `Kampanya oluşturuldu (${campaign.campaignNumber}) — AI dönüşüm tahminini yeterli buldu, vaka açılmadı (sağlıklı kampanya).`,
        );
      }
      navigate('/expert/cases');
    } catch (err) {
      show('error', apiErrorMessage(err, 'Kampanya oluşturulamadı'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>Yeni Kampanya</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Başlık</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Tip</label>
          <select value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
            {Object.values(CampaignType).map((t) => (
              <option key={t} value={t}>
                {CAMPAIGN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Öngörülen Hedef Segment (opsiyonel)</label>
          <select value={targetSegmentHint} onChange={(e) => setTargetSegmentHint(e.target.value as SegmentType | '')}>
            <option value="">Belirtilmedi (AI belirlesin)</option>
            {Object.values(SegmentType).map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>İndirim Oranı (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={discountRate}
            onChange={(e) => setDiscountRate(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-field">
          <label>Geçerlilik Tarihi</label>
          <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Hedef Abone ID'leri (virgülle ayrılmış, opsiyonel)</label>
          <input value={subscriberIds} onChange={(e) => setSubscriberIds(e.target.value)} placeholder="abone-id-1, abone-id-2" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          Kampanya Oluştur
        </button>
      </form>
    </div>
  );
}
