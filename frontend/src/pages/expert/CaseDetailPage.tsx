import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CaseStatus, SegmentType } from '@campaigncell/shared-types';
import {
  CaseHistoryEntry,
  completeCase,
  completeTest,
  getCase,
  getCaseHistory,
  startCase,
  startTest,
  updateSegment,
} from '../../api/caseApi';
import { apiErrorMessage } from '../../api/client';
import { OptimizationCase } from '../../types';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { SlaCountdown } from '../../shared/components/SlaCountdown';
import { Timeline } from '../../shared/components/Timeline';
import { PRIORITY_LABELS, SEGMENT_LABELS, STATUS_LABELS } from '../../shared/labels';
import { useToast } from '../../shared/ToastContext';
import { useAuth } from '../../auth/AuthContext';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OptimizationCase | null>(null);
  const [history, setHistory] = useState<CaseHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [lift, setLift] = useState(0.15);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const { user } = useAuth();

  function load() {
    if (!id) return;
    setError(null);
    getCase(id)
      .then(setItem)
      .catch((err) => setError(apiErrorMessage(err, 'Vaka yüklenemedi')));
    getCaseHistory(id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  useEffect(load, [id]);

  async function runAction<T>(action: () => Promise<T>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      show('success', successMessage);
      load();
    } catch (err) {
      show('error', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!item) return <LoadingSpinner label="Vaka yükleniyor..." />;

  return (
    <div className="grid grid-2">
      <div>
        <div className={`card priority-strip priority-${item.priority}`}>
          <h2>{item.campaign?.title ?? 'Kampanya'}</h2>
          <p style={{ color: 'var(--color-muted)' }}>{item.campaign?.campaignNumber}</p>

          <table>
            <tbody>
              <tr>
                <td>Durum</td>
                <td>{STATUS_LABELS[item.status]}</td>
              </tr>
              <tr>
                <td>Segment</td>
                <td>
                  <span className={`segment-${item.segment}`}>
                    <span className={`segment-dot segment-${item.segment}`} />
                    {SEGMENT_LABELS[item.segment]}
                  </span>{' '}
                  {item.wasAiClassified && <span className="badge-pill pill-info">AI</span>}
                </td>
              </tr>
              <tr>
                <td>Öncelik</td>
                <td>
                  <span className={`badge-pill ${item.priority === 'KRITIK' ? 'pill-danger' : item.priority === 'YUKSEK' ? 'pill-warning' : 'pill-info'}`}>
                    {PRIORITY_LABELS[item.priority]}
                  </span>
                </td>
              </tr>
              <tr>
                <td>SLA</td>
                <td>
                  <SlaCountdown dueAt={item.slaDueAt} completedAt={item.completedAt} />
                </td>
              </tr>
              <tr>
                <td>Dönüşüm Olasılığı</td>
                <td>{item.conversionProbability != null ? `%${Math.round(item.conversionProbability * 100)}` : 'Henüz yeterli veri yok'}</td>
              </tr>
              {item.optimizationNote && (
                <tr>
                  <td>Optimizasyon Notu</td>
                  <td>{item.optimizationNote}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}>
              Segmenti Değiştir (AI override)
            </label>
            <p style={{ margin: '2px 0 6px', fontSize: '0.76rem', color: 'var(--color-muted)' }}>
              Bu değişiklik AI doğruluk metriğine yansıyacaktır.
            </p>
            <select
              style={{ display: 'block' }}
              value={item.segment}
              disabled={busy}
              onChange={(e) => runAction(() => updateSegment(item.id, e.target.value as SegmentType), 'Segment güncellendi')}
            >
              {Object.values(SegmentType).map((s) => (
                <option key={s} value={s}>
                  {SEGMENT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <h3>Durum Geçmişi</h3>
          <Timeline entries={history} currentUserId={user?.id} />
        </div>
      </div>

      <div className="card">
        <h3>İşlemler</h3>

        {item.status === CaseStatus.ATANDI && (
          <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => startCase(item.id), 'Optimizasyona başlandı')}>
            Optimizasyona Başla
          </button>
        )}

        {item.status === CaseStatus.OPTIMIZE_EDILIYOR && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-secondary" disabled={busy} onClick={() => runAction(() => startTest(item.id), 'A/B testi başlatıldı')}>
              A/B Testi Başlat
            </button>

            <div>
              <p style={{ marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>Optimizasyonu Tamamla</p>
              <textarea
                placeholder="Optimizasyon notu (zorunlu)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
              <div className="form-field">
                <label>Dönüşüm Artışı (0-1)</label>
                <input type="number" step="0.01" min={0} max={1} value={lift} onChange={(e) => setLift(Number(e.target.value))} />
              </div>
              <button
                className="btn btn-success"
                disabled={busy || note.trim().length < 5}
                onClick={() => runAction(() => completeCase(item.id, note, lift), 'Optimizasyon tamamlandı')}
              >
                Tamamla
              </button>
            </div>
          </div>
        )}

        {item.status === CaseStatus.TEST_EDILIYOR && (
          <div>
            <div className="form-field">
              <label>Test Sonucu: Dönüşüm Artışı (0-1)</label>
              <input type="number" step="0.01" min={0} max={1} value={lift} onChange={(e) => setLift(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => completeTest(item.id, lift), 'Test sonucu kaydedildi')}>
              Testi Sonuçlandır
            </button>
          </div>
        )}

        {(item.status === CaseStatus.TAMAMLANDI || item.status === CaseStatus.YAYINDA || item.status === CaseStatus.ARSIVLENDI) && (
          <p style={{ color: 'var(--color-muted)' }}>Bu vaka için uzman işlemleri tamamlandı.</p>
        )}
      </div>
    </div>
  );
}
