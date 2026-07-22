import { useEffect, useState } from 'react';
import { accuracyByCategory, accuracyOverall, AccuracyByCategory, AccuracyOverall, listOverrides, SegmentOverride } from '../../api/aiApi';
import { listStaff } from '../../api/usersApi';
import { apiErrorMessage } from '../../api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { SEGMENT_LABELS } from '../../shared/labels';

export function AiInsightsPage() {
  const [overall, setOverall] = useState<AccuracyOverall | null>(null);
  const [byCategory, setByCategory] = useState<AccuracyByCategory[] | null>(null);
  const [overrides, setOverrides] = useState<SegmentOverride[] | null>(null);
  const [staffNames, setStaffNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    Promise.all([accuracyOverall(), accuracyByCategory(), listOverrides(), listStaff()])
      .then(([o, c, ov, staff]) => {
        setOverall(o);
        setByCategory(c);
        setOverrides(ov);
        setStaffNames(new Map(staff.map((u) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id.slice(0, 8)])));
      })
      .catch((err) => setError(apiErrorMessage(err, 'AI içgörüleri yüklenemedi')));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!overall || !byCategory || !overrides) return <LoadingSpinner label="AI içgörüleri yükleniyor..." />;

  const best = byCategory.filter((c) => c.accuracyRate != null).sort((a, b) => (b.accuracyRate ?? 0) - (a.accuracyRate ?? 0))[0];
  const worst = byCategory.filter((c) => c.accuracyRate != null).sort((a, b) => (a.accuracyRate ?? 0) - (b.accuracyRate ?? 0))[0];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>AI İçgörüleri</h2>
      <div className="grid grid-5" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="value">{overall.accuracyRate != null ? `%${overall.accuracyRate}` : '—'}</div>
          <div className="label">Genel Doğruluk</div>
        </div>
        <div className="stat-tile">
          <div className="value">{overall.total}</div>
          <div className="label">Toplam Sınıflandırma</div>
        </div>
        <div className="stat-tile">
          <div className="value">{overall.incorrect}</div>
          <div className="label">Override Sayısı</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--color-success)' }}>
            {best ? SEGMENT_LABELS[best.segment] ?? best.segment : '—'}
          </div>
          <div className="label">En İyi Segment {best?.accuracyRate != null ? `(%${best.accuracyRate})` : ''}</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--color-danger)' }}>
            {worst ? SEGMENT_LABELS[worst.segment] ?? worst.segment : '—'}
          </div>
          <div className="label">En Düşük Doğruluk {worst?.accuracyRate != null ? `(%${worst.accuracyRate})` : ''}</div>
        </div>
      </div>

      <div className="card">
        <h3>Kategori Doğruluğu</h3>
        {byCategory.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Henüz yeterli veri yok.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Doğru / Toplam</th>
                <th>Oran</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((c) => (
                <tr key={c.segment}>
                  <td>
                    <span className={`segment-dot segment-${c.segment}`} />
                    {SEGMENT_LABELS[c.segment] ?? c.segment}
                  </td>
                  <td>
                    {c.total - c.incorrect} / {c.total}
                    {c.total < 5 && (
                      <span className="badge-pill pill-muted" style={{ marginLeft: 6 }} title="Örnek sayısı düşük, oran yanıltıcı olabilir">
                        az veri
                      </span>
                    )}
                  </td>
                  <td>{c.accuracyRate != null ? `%${c.accuracyRate}` : 'Henüz yeterli veri yok'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Override Tablosu</h3>
        <p style={{ color: 'var(--color-muted)' }}>Uzman/süpervizörün AI segmentini değiştirdiği vakalar.</p>
        {overrides.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Henüz bir override yapılmadı.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kampanya</th>
                <th>AI Segmenti</th>
                <th>Yeni Segment</th>
                <th>Değiştiren</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.campaignId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{o.campaignId.slice(0, 8)}</td>
                  <td>{SEGMENT_LABELS[o.predictedSegment] ?? o.predictedSegment}</td>
                  <td>{o.correctedSegment ? SEGMENT_LABELS[o.correctedSegment] ?? o.correctedSegment : '—'}</td>
                  <td>{o.correctedBy ? staffNames.get(o.correctedBy) ?? o.correctedBy.slice(0, 8) : '—'}</td>
                  <td>{o.correctedAt ? new Date(o.correctedAt).toLocaleString('tr-TR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
