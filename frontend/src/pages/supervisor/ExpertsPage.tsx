import { useEffect, useState } from 'react';
import { listExpertProfiles, ExpertProfile } from '../../api/aiApi';
import { expertPerformance, ExpertPerformanceRow } from '../../api/statsApi';
import { listStaff } from '../../api/usersApi';
import { profileById, Profile } from '../../api/gameApi';
import { apiErrorMessage } from '../../api/client';
import { AuthUser } from '../../auth/authStore';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EXPERT_SPECIALTY_LABELS, LEVEL_LABELS } from '../../shared/labels';

interface Row {
  userId: string;
  name: string;
  specialties: string[];
  activeCaseCount: number;
  completedCount: number;
  averageDurationHours: number;
  averageConversionLift: number | null;
  points: number | null;
  level: string | null;
}

const CAPACITY = 10;

export function ExpertsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setRows(null);
    // listExpertProfiles() AI Service'ten gelir; AI kapalıyken boş dizi ile
    // devam edilir (kapasite kolonu 0 görünür), sayfa yine açılır - servis
    // bağımsızlığı. Diğer veriler Identity/Campaign/Gamification'dan.
    Promise.all([listStaff(), expertPerformance(), listExpertProfiles().catch(() => [] as ExpertProfile[])])
      .then(async ([staff, perf, profiles]) => {
        const experts = staff.filter((s) => s.role === 'PERSONEL');
        const perfById = new Map<string, ExpertPerformanceRow>(perf.map((p) => [p.expertId, p]));
        const profileById_ = new Map<string, ExpertProfile>(profiles.map((p) => [p.userId, p]));

        const gameProfiles = await Promise.allSettled(experts.map((e) => profileById(e.id)));
        const gameByUser = new Map<string, Profile>();
        experts.forEach((e, i) => {
          const result = gameProfiles[i];
          if (result.status === 'fulfilled') gameByUser.set(e.id, result.value);
        });

        const built: Row[] = experts.map((e: AuthUser) => {
          const p = perfById.get(e.id);
          const ep = profileById_.get(e.id);
          const gp = gameByUser.get(e.id);
          return {
            userId: e.id,
            name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.id.slice(0, 8),
            specialties: e.specialties,
            activeCaseCount: ep?.activeCaseCount ?? 0,
            completedCount: p?.completedCount ?? 0,
            averageDurationHours: p?.averageDurationHours ?? 0,
            averageConversionLift: p?.averageConversionLift ?? null,
            points: gp?.totalPoints ?? null,
            level: gp?.level ?? null,
          };
        });
        setRows(built);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Uzman verileri yüklenemedi')));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!rows) return <LoadingSpinner label="Uzmanlar yükleniyor..." />;

  return (
    <div className="card">
      <h2>Uzman Performansı ve Kapasite</h2>
      <table>
        <thead>
          <tr>
            <th>Uzman</th>
            <th>Uzmanlık</th>
            <th>Kapasite</th>
            <th>Tamamlanan</th>
            <th>Ort. Süre</th>
            <th>Ort. Dönüşüm Artışı</th>
            <th>Puan / Seviye</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const full = r.activeCaseCount >= CAPACITY;
            return (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  {r.specialties.map((s) => EXPERT_SPECIALTY_LABELS[s] ?? s).join(', ') || '—'}
                </td>
                <td style={{ minWidth: 120 }}>
                  <div>
                    {r.activeCaseCount} / {CAPACITY}
                  </div>
                  <div className="capacity-bar">
                    <div
                      className={`capacity-bar-fill${full ? ' full' : ''}`}
                      style={{ width: `${Math.min(100, (r.activeCaseCount / CAPACITY) * 100)}%` }}
                    />
                  </div>
                </td>
                <td>{r.completedCount}</td>
                <td>{r.averageDurationHours ? `${r.averageDurationHours} sa` : '—'}</td>
                <td>{r.averageConversionLift != null ? `%${Math.round(r.averageConversionLift * 100)}` : '—'}</td>
                <td>
                  {r.points != null ? (
                    <>
                      {r.points} <span className="badge-pill pill-info">{LEVEL_LABELS[r.level ?? ''] ?? r.level}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
