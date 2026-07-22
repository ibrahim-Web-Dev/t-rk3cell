import { useEffect, useState } from 'react';
import { assignExpert, listPendingQueue } from '../../api/caseApi';
import { listStaff } from '../../api/usersApi';
import { apiErrorMessage } from '../../api/client';
import { OptimizationCase } from '../../types';
import { AuthUser } from '../../auth/authStore';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { EXPERT_SPECIALTY_LABELS, PRIORITY_LABELS, SEGMENT_LABELS } from '../../shared/labels';
import { useToast } from '../../shared/ToastContext';

export function PendingQueuePage() {
  const [cases, setCases] = useState<OptimizationCase[] | null>(null);
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    setError(null);
    setCases(null);
    Promise.all([listPendingQueue(), listStaff()])
      .then(([c, s]) => {
        setCases(c);
        setStaff(s.filter((u) => u.role === 'PERSONEL'));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Kuyruk yüklenemedi')));
  }

  useEffect(load, []);

  async function handleAssign(caseId: string, expertId: string) {
    if (!expertId) return;
    try {
      await assignExpert(caseId, expertId);
      show('success', 'Uzman atandı');
      load();
    } catch (err) {
      show('error', apiErrorMessage(err));
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!cases) return <LoadingSpinner label="Kuyruk yükleniyor..." />;
  if (cases.length === 0) return <EmptyState message="Bekleyen optimizasyon vakası yok." />;

  return (
    <div className="card">
      <h2>Bekleyen Optimizasyon Kuyruğu</h2>
      <p style={{ color: 'var(--color-muted)' }}>BELIRSIZ segment veya kapasite bekleyen, manuel atama gereken vakalar.</p>
      <table>
        <thead>
          <tr>
            <th>Kampanya</th>
            <th>Segment</th>
            <th>Öncelik</th>
            <th>Uzman Ata</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td>{c.campaign?.title ?? c.campaignId}</td>
              <td>{SEGMENT_LABELS[c.segment]}</td>
              <td>{PRIORITY_LABELS[c.priority]}</td>
              <td>
                <select defaultValue="" onChange={(e) => handleAssign(c.id, e.target.value)}>
                  <option value="" disabled>
                    Uzman seçin
                  </option>
                  {staff.map((s) => {
                    const specialty = s.specialties.map((sp) => EXPERT_SPECIALTY_LABELS[sp] ?? sp).join(', ');
                    return (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                        {specialty ? ` — ${specialty}` : ''}
                      </option>
                    );
                  })}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
