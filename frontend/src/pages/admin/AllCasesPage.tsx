import { useEffect, useMemo, useState } from 'react';
import { listCases } from '../../api/caseApi';
import { listStaff } from '../../api/usersApi';
import { apiErrorMessage } from '../../api/client';
import { OptimizationCase } from '../../types';
import { AuthUser } from '../../auth/authStore';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { PRIORITY_LABELS, SEGMENT_LABELS, STATUS_LABELS } from '../../shared/labels';
import { formatRemaining, slaPillClass } from '../../shared/slaHelpers';

export function AllCasesPage() {
  const [cases, setCases] = useState<OptimizationCase[] | null>(null);
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);

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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
