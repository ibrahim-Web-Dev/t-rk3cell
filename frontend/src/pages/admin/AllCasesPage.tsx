import { useEffect, useMemo, useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { Role, CaseStatus } from '@campaigncell/shared-types';
import { listCases, publishCase } from '../../api/caseApi';
import { listStaff } from '../../api/usersApi';
import { deleteCampaign } from '../../api/campaignApi';
import { apiErrorMessage } from '../../api/client';
import { OptimizationCase } from '../../types';
import { AuthUser } from '../../auth/authStore';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../shared/ToastContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { PRIORITY_LABELS, SEGMENT_LABELS, STATUS_LABELS } from '../../shared/labels';
import { formatRemaining, slaPillClass } from '../../shared/slaHelpers';

export function AllCasesPage() {
  const [cases, setCases] = useState<OptimizationCase[] | null>(null);
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { show } = useToast();
  const isAdmin = user?.role === Role.ADMIN;
  const isSupervisor = user?.role === Role.SUPERVISOR;
  const showActions = isAdmin || isSupervisor;

  function load() {
    setError(null);
    setCases(null);
    Promise.all([listCases(), listStaff()])
      .then(([c, s]) => {
        setCases(c);
        setStaff(s);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Vakalar yüklenemedi')));
  }

  useEffect(load, []);

  async function handleDelete(campaignId: string, title: string) {
    if (!window.confirm(`"${title}" kampanyası ve ilişkili vaka/teklifler silinecek. Emin misiniz?`)) return;
    setDeletingId(campaignId);
    try {
      await deleteCampaign(campaignId);
      show('success', 'Kampanya silindi');
      load();
    } catch (err) {
      show('error', apiErrorMessage(err, 'Kampanya silinemedi'));
    } finally {
      setDeletingId(null);
    }
  }

  // TAMAMLANDI -> YAYINDA (case doc 4.2: "Yönetici / Onay verildi"). Süpervizör
  // tamamlanan optimizasyonu onaylayıp yayına alır.
  async function handlePublish(caseId: string) {
    setPublishingId(caseId);
    try {
      await publishCase(caseId);
      show('success', 'Vaka yayına alındı');
      load();
    } catch (err) {
      show('error', apiErrorMessage(err, 'Yayınlanamadı'));
    } finally {
      setPublishingId(null);
    }
  }

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const perExpertCounts = useMemo(() => {
    if (!cases) return [];
    const counts = new Map<string, number>();
    for (const c of cases) {
      const key = c.assignedExpertId ?? 'unassigned';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([expertId, count]) => ({
        expertId,
        name:
          expertId === 'unassigned'
            ? 'Atanmamış'
            : (() => {
                const s = staffById.get(expertId);
                return s ? `${s.firstName} ${s.lastName}` : expertId.slice(0, 8);
              })(),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [cases, staffById]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!cases) return <LoadingSpinner label="Vakalar yükleniyor..." />;
  if (cases.length === 0) return <EmptyState message="Sistemde henüz optimizasyon vakası yok." />;

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {perExpertCounts.map((e) => (
          <div className="stat-tile" key={e.expertId}>
            <div className="value">{e.count}</div>
            <div className="label">{e.name}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Tüm Optimizasyon Vakaları</h2>
        <p style={{ color: 'var(--color-muted)' }}>Kime hangi vakanın atandığının tam listesi (kişi başına düşen yük dahil).</p>
        <table>
          <thead>
            <tr>
              <th>Kampanya</th>
              <th>Segment</th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th>Atanan Uzman</th>
              <th>SLA</th>
              {showActions && <th style={{ textAlign: 'right' }}>İşlem</th>}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const expert = c.assignedExpertId ? staffById.get(c.assignedExpertId) : undefined;
              return (
                <tr key={c.id}>
                  <td>{c.campaign?.title ?? c.campaignId}</td>
                  <td>{SEGMENT_LABELS[c.segment]}</td>
                  <td>
                    <span className={`badge-pill ${slaPillClass(c.priority, c.slaBreached)}`}>{PRIORITY_LABELS[c.priority]}</span>
                  </td>
                  <td>{STATUS_LABELS[c.status]}</td>
                  <td>{expert ? `${expert.firstName} ${expert.lastName}` : c.assignedExpertId ? c.assignedExpertId.slice(0, 8) : '—'}</td>
                  <td>{formatRemaining(c.slaDueAt, c.completedAt)}</td>
                  {showActions && (
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {isSupervisor && c.status === CaseStatus.TAMAMLANDI && (
                        <button
                          className="btn btn-success btn-sm"
                          disabled={publishingId === c.id}
                          onClick={() => handlePublish(c.id)}
                          title="Onayla ve yayına al (TAMAMLANDI → YAYINDA)"
                          style={{ marginRight: 6 }}
                        >
                          <Send size={14} /> {publishingId === c.id ? 'Yayınlanıyor…' : 'Yayınla'}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={deletingId === c.campaignId}
                          onClick={() => handleDelete(c.campaignId, c.campaign?.title ?? c.campaignId)}
                          title="Kampanyayı sil"
                        >
                          <Trash2 size={14} /> {deletingId === c.campaignId ? 'Siliniyor…' : 'Sil'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
