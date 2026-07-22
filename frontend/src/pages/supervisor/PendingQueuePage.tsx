import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { assignExpert, listPendingQueue } from '../../api/caseApi';
import { listStaff } from '../../api/usersApi';
import { ExpertProfile, listExpertProfiles } from '../../api/aiApi';
import { apiErrorMessage } from '../../api/client';
import { OptimizationCase } from '../../types';
import { AuthUser } from '../../auth/authStore';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { PRIORITY_LABELS, SEGMENT_LABELS } from '../../shared/labels';
import { slaPillClass } from '../../shared/slaHelpers';
import { useToast } from '../../shared/ToastContext';
import { AssignDrawer } from './AssignDrawer';

export function PendingQueuePage() {
  const [cases, setCases] = useState<OptimizationCase[] | null>(null);
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [profiles, setProfiles] = useState<ExpertProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<OptimizationCase | null>(null);
  const [busyExpertId, setBusyExpertId] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    setError(null);
    setCases(null);
    Promise.all([listPendingQueue(), listStaff(), listExpertProfiles().catch(() => [])])
      .then(([c, s, p]) => {
        setCases(c);
        setStaff(s.filter((u) => u.role === 'PERSONEL'));
        setProfiles(p);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Kuyruk yüklenemedi')));
  }

  useEffect(load, []);

  async function handleAssign(expertId: string) {
    if (!activeCase) return;
    setBusyExpertId(expertId);
    try {
      await assignExpert(activeCase.id, expertId);
      show('success', 'Uzman atandı');
      setActiveCase(null);
      load();
    } catch (err) {
      show('error', apiErrorMessage(err));
    } finally {
      setBusyExpertId(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!cases) return <LoadingSpinner label="Kuyruk yükleniyor..." />;
  if (cases.length === 0) return <EmptyState message="Bekleyen optimizasyon vakası yok." />;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Bekleyen Optimizasyon Kuyruğu</h2>
      <p style={{ color: 'var(--color-muted)' }}>
        BELIRSIZ segment veya kapasite bekleyen, manuel atama gereken vakalar. Atamak için bir vaka seçin — uzman
        adaylarını kapasite, performans ve AI öneri skoruyla karşılaştırın.
      </p>
      <table>
        <thead>
          <tr>
            <th>Kampanya</th>
            <th>Segment</th>
            <th>Öncelik</th>
            <th style={{ textAlign: 'right' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td>{c.campaign?.title ?? c.campaignId}</td>
              <td>
                <span className={`segment-dot segment-${c.segment}`} /> {SEGMENT_LABELS[c.segment]}
              </td>
              <td>
                <span className={`badge-pill ${slaPillClass(c.priority, c.slaBreached)}`}>{PRIORITY_LABELS[c.priority]}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn btn-secondary" onClick={() => setActiveCase(c)}>
                  <UserPlus size={14} /> Uzman Ata
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeCase && (
        <AssignDrawer
          activeCase={activeCase}
          staff={staff}
          profiles={profiles}
          busyExpertId={busyExpertId}
          onAssign={handleAssign}
          onClose={() => setActiveCase(null)}
        />
      )}
    </div>
  );
}
