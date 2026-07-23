import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Role } from '@campaigncell/shared-types';
import { listCampaigns } from '../api/campaignApi';
import { apiErrorMessage } from '../api/client';
import { Campaign } from '../types';
import { useAuth } from '../auth/AuthContext';
import { LoadingSpinner } from '../shared/components/LoadingSpinner';
import { ErrorState } from '../shared/components/ErrorState';
import { EmptyState } from '../shared/components/EmptyState';
import { CAMPAIGN_TYPE_LABELS, PRIORITY_LABELS, SEGMENT_LABELS, STATUS_LABELS } from '../shared/labels';

/**
 * Tüm kampanyaların listesi - VAKA açılanlar da, "sağlıklı" (vaka açılmamış)
 * olanlar da. "Tüm Vakalar" ekranı yalnızca optimizasyon vakalarını
 * gösterdiğinden, dönüşüm tahmini eşiğin üstünde kalıp vaka açılmayan
 * kampanyalar orada görünmüyordu; burada hepsi görünür.
 */
export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isExpert = user?.role === Role.PERSONEL;

  function load() {
    setError(null);
    setCampaigns(null);
    listCampaigns()
      .then((c) => setCampaigns([...c].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))))
      .catch((err) => setError(apiErrorMessage(err, 'Kampanyalar yüklenemedi')));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!campaigns) return <LoadingSpinner label="Kampanyalar yükleniyor..." />;

  const pct = (v: number | null) => (v == null ? '—' : `%${Math.round(v * 100)}`);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>{isExpert ? 'Kampanyalarım' : 'Kampanyalar'}</h2>
          <p style={{ color: 'var(--color-muted)', margin: '4px 0 0' }}>
            Vaka açılan ve açılmayan ("sağlıklı") tüm kampanyalar. Toplam {campaigns.length}.
          </p>
        </div>
        {isExpert && (
          <Link to="/expert/campaigns/new" className="btn btn-primary">
            <Plus size={15} /> Yeni Kampanya
          </Link>
        )}
      </div>

      {campaigns.length === 0 ? (
        <EmptyState message="Henüz kampanya yok." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>No</th>
                <th>Başlık</th>
                <th>Tip</th>
                <th>AI Segment</th>
                <th>Öncelik</th>
                <th>Dönüşüm</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{c.campaignNumber}</td>
                  <td>{c.title}</td>
                  <td>{CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}</td>
                  <td>
                    {c.aiSegment ? (
                      <>
                        <span className={`segment-dot segment-${c.aiSegment}`} /> {SEGMENT_LABELS[c.aiSegment]}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{c.aiPriority ? PRIORITY_LABELS[c.aiPriority] : '—'}</td>
                  <td>{pct(c.aiConversionProbability)}</td>
                  <td>
                    {c.optimizationCase ? (
                      <span className="badge-pill pill-info">{STATUS_LABELS[c.optimizationCase.status] ?? c.optimizationCase.status}</span>
                    ) : (
                      <span className="badge-pill pill-success" title="Dönüşüm tahmini eşiğin üzerinde — optimizasyon vakası açılmadı">
                        Sağlıklı · vaka yok
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
