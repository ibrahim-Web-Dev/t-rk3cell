import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCases } from '../../api/caseApi';
import { apiErrorMessage } from '../../api/client';
import { OptimizationCase } from '../../types';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { PRIORITY_LABELS, SEGMENT_LABELS, STATUS_LABELS } from '../../shared/labels';
import { formatRemaining, slaPillClass } from '../../shared/slaHelpers';

export function CaseQueuePage() {
  const [cases, setCases] = useState<OptimizationCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setCases(null);
    listCases()
      .then(setCases)
      .catch((err) => setError(apiErrorMessage(err, 'Vakalar yüklenemedi')));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!cases) return <LoadingSpinner label="Vakalar yükleniyor..." />;
  if (cases.length === 0) return <EmptyState message="Size atanmış bir optimizasyon vakası bulunmuyor." />;

  return (
    <div className="card">
      <h2>Optimizasyon Vakalarım</h2>
      <table>
        <thead>
          <tr>
            <th>Kampanya</th>
            <th>Segment</th>
            <th>Öncelik</th>
            <th>Durum</th>
            <th>SLA</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td>{c.campaign?.title ?? c.campaignId}</td>
              <td>{SEGMENT_LABELS[c.segment]}</td>
              <td>
                <span className={`badge-pill ${slaPillClass(c.priority, c.slaBreached)}`}>{PRIORITY_LABELS[c.priority]}</span>
              </td>
              <td>{STATUS_LABELS[c.status]}</td>
              <td>{formatRemaining(c.slaDueAt, c.completedAt)}</td>
              <td>
                <Link className="btn btn-secondary" to={`/expert/cases/${c.id}`}>
                  Aç
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
