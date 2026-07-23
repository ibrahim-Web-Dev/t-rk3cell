import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { CampaignType, SegmentType } from '@campaigncell/shared-types';
import { createCampaign } from '../../api/campaignApi';
import { apiErrorMessage } from '../../api/client';
import { Campaign } from '../../types';
import { useToast } from '../../shared/ToastContext';
import { CAMPAIGN_TYPE_LABELS, PRIORITY_LABELS, SEGMENT_LABELS } from '../../shared/labels';

const STEPS = ['Temel Bilgiler', 'Hedefleme', 'Teklif', 'Önizleme'] as const;

export function NewCampaignPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CampaignType>(CampaignType.EK_PAKET);
  const [targetSegmentHint, setTargetSegmentHint] = useState<SegmentType | ''>('');
  const [subscriberIds, setSubscriberIds] = useState('');
  const [discountRate, setDiscountRate] = useState(20);
  const [validUntil, setValidUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Campaign | null>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  function resetForm() {
    setResult(null);
    setStep(0);
    setTitle('');
    setType(CampaignType.EK_PAKET);
    setTargetSegmentHint('');
    setSubscriberIds('');
    setDiscountRate(20);
    setValidUntil('');
  }

  const subscriberIdList = subscriberIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const canGoNext = [
    title.trim().length > 0,
    true, // hedefleme opsiyonel
    discountRate >= 0 && discountRate <= 100 && !!validUntil,
    true,
  ];

  async function handleSubmit() {
    setLoading(true);
    try {
      const campaign = await createCampaign({
        title,
        type,
        targetSegmentHint: targetSegmentHint || undefined,
        discountRate,
        validUntil: new Date(validUntil).toISOString(),
        targetSubscriberIds: subscriberIdList,
      });
      show('success', `Kampanya oluşturuldu (${campaign.campaignNumber})`);
      setResult(campaign); // AI sonucunu ekranda göster (yönlendirme yerine)
    } catch (err) {
      show('error', apiErrorMessage(err, 'Kampanya oluşturulamadı'));
    } finally {
      setLoading(false);
    }
  }

  // Kampanya oluşturulduktan sonra: AI'ın sınıflandırma sonucunu göster
  // (demo senaryosu adım 3 — segment + öncelik + güven + dönüşüm tahmini).
  if (result) {
    const noCaseButHealthy = !result.optimizationCase;
    const assignedExpertId = result.optimizationCase?.assignedExpertId ?? null;
    const pct = (v: number | null) => (v == null ? '—' : `%${Math.round(v * 100)}`);
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-brand-navy)', color: 'var(--color-brand-yellow)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} />
          </span>
          <div>
            <h2 style={{ margin: 0 }}>AI Analizi Tamamlandı</h2>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              {result.campaignNumber} · {result.title}
            </div>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div className="stat-tile">
            <div className="label">AI Segment</div>
            <div className="value" style={{ fontSize: '1.2rem' }}>
              <span className={`segment-dot segment-${result.aiSegment}`} /> {result.aiSegment ? SEGMENT_LABELS[result.aiSegment] : 'BELİRSİZ'}
            </div>
          </div>
          <div className="stat-tile">
            <div className="label">Öncelik</div>
            <div className="value" style={{ fontSize: '1.2rem' }}>{result.aiPriority ? PRIORITY_LABELS[result.aiPriority] : 'ORTA'}</div>
          </div>
          <div className="stat-tile">
            <div className="label">AI Güven</div>
            <div className="value" style={{ fontSize: '1.2rem' }}>{pct(result.aiConfidence)}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Dönüşüm Tahmini</div>
            <div className="value" style={{ fontSize: '1.2rem' }}>{pct(result.aiConversionProbability)}</div>
          </div>
        </div>

        <div className={`service-banner ${noCaseButHealthy ? 'ok' : ''}`} style={{ marginTop: 16 }}>
          {noCaseButHealthy ? (
            <>AI dönüşüm tahminini <strong>yeterli</strong> buldu (eşiğin üzerinde) — vaka açılmadı, kampanya "sağlıklı". Abonelere teklifler yine de üretildi.</>
          ) : (
            <>
              Dönüşüm tahmini eşiğin (<strong>%40</strong>) altında → bir <strong>optimizasyon vakası</strong> açıldı.
              {assignedExpertId ? (
                <> AI, vakayı en uygun uzmana <strong>otomatik atadı</strong> (uzmanlık×0.5 + boşluk×0.3 + performans×0.2).</>
              ) : (
                <> Uygun uzman bulunamadı → <strong>manuel kuyruğa</strong> düştü.</>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn btn-primary" onClick={() => navigate('/expert/cases')}>
            Vakalarıma Git
          </button>
          <button className="btn btn-secondary" onClick={resetForm}>
            Yeni Kampanya Oluştur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h2>Yeni Kampanya</h2>

      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <div className="form-field">
            <label>Başlık</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>
          <div className="form-field">
            <label>Kampanya Tipi</label>
            <select value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
              {Object.values(CampaignType).map((t) => (
                <option key={t} value={t}>
                  {CAMPAIGN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
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
            <label>Hedef Abone ID'leri (virgülle ayrılmış, opsiyonel)</label>
            <input value={subscriberIds} onChange={(e) => setSubscriberIds(e.target.value)} placeholder="abone-id-1, abone-id-2" />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Tahmini hedef abone sayısı: <strong>{subscriberIdList.length}</strong>
          </p>
        </div>
      )}

      {step === 2 && (
        <div>
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
            <label>Geçerlilik Tarihi (bitiş)</label>
            <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <table style={{ marginBottom: 16 }}>
            <tbody>
              <tr>
                <td>Başlık</td>
                <td>{title}</td>
              </tr>
              <tr>
                <td>Tip</td>
                <td>{CAMPAIGN_TYPE_LABELS[type]}</td>
              </tr>
              <tr>
                <td>Hedef Segment</td>
                <td>{targetSegmentHint ? SEGMENT_LABELS[targetSegmentHint] : 'AI belirleyecek'}</td>
              </tr>
              <tr>
                <td>Hedef Abone Sayısı</td>
                <td>{subscriberIdList.length}</td>
              </tr>
              <tr>
                <td>İndirim Oranı</td>
                <td>%{discountRate}</td>
              </tr>
              <tr>
                <td>Geçerlilik</td>
                <td>{validUntil || '—'}</td>
              </tr>
            </tbody>
          </table>
          <div className="service-banner ok">Kampanya oluşturulduğunda AI analizi (segment, öncelik, dönüşüm tahmini) otomatik tetiklenecek.</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button className="btn btn-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Geri
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" disabled={!canGoNext[step]} onClick={() => setStep((s) => s + 1)}>
            İleri
          </button>
        ) : (
          <button className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
            Kampanyayı Oluştur
          </button>
        )}
      </div>
    </div>
  );
}
