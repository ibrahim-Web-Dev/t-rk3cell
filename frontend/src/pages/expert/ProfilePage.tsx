import { useEffect, useMemo, useState } from 'react';
import { leaderboard, LeaderboardEntry, myProfile, Profile } from '../../api/gameApi';
import { listStaffDirectory, StaffDirectoryEntry } from '../../api/usersApi';
import { apiErrorMessage } from '../../api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { BADGE_LABELS, LEVEL_LABELS } from '../../shared/labels';
import { useRealtime } from '../../realtime/useRealtime';
import { useToast } from '../../shared/ToastContext';
import { useAuth } from '../../auth/AuthContext';

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [daily, setDaily] = useState<LeaderboardEntry[]>([]);
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([]);
  const [directory, setDirectory] = useState<StaffDirectoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();
  const { user } = useAuth();

  const namesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of directory) {
      const name = [s.firstName, s.lastName].filter(Boolean).join(' ');
      if (name) map.set(s.id, name);
    }
    return map;
  }, [directory]);

  function load() {
    setError(null);
    Promise.all([myProfile(), leaderboard('daily'), leaderboard('weekly'), listStaffDirectory()])
      .then(([p, d, w, dir]) => {
        setProfile(p);
        setDaily(d);
        setWeekly(w);
        setDirectory(dir);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Profil yüklenemedi')));
  }

  useEffect(load, []);

  useRealtime(
    {
      onPointsUpdated: () => load(),
      onBadgeEarned: (data) => show('badge', `🏆 Yeni rozet: ${BADGE_LABELS[data.badgeCode] ?? data.badgeCode}`),
    },
    true,
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profile) return <LoadingSpinner label="Profil yükleniyor..." />;

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="value">{profile.totalPoints}</div>
          <div className="label">Toplam Puan</div>
        </div>
        <div className="stat-tile">
          <div className="value">{LEVEL_LABELS[profile.level] ?? profile.level}</div>
          <div className="label">Seviye</div>
        </div>
        <div className="stat-tile">
          <div className="value">{profile.completedCaseCount}</div>
          <div className="label">Çözülen Vaka</div>
        </div>
        <div className="stat-tile">
          <div className="value">{profile.averagePoints}</div>
          <div className="label">Ortalama Puan</div>
        </div>
        <div className="stat-tile">
          <div className="value">{profile.dailyRank ?? '-'}</div>
          <div className="label">Günlük Sıralama</div>
        </div>
        <div className="stat-tile">
          <div className="value">{profile.weeklyRank ?? '-'}</div>
          <div className="label">Haftalık Sıralama</div>
        </div>
      </div>

      <div className="card">
        <h3>Rozetler</h3>
        {profile.badges.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Henüz rozet kazanılmadı.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.badges.map((b) => (
              <span key={b.badgeCode} className="badge-pill pill-warning">
                🏆 {BADGE_LABELS[b.badgeCode] ?? b.badgeCode}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-2">
        <LeaderboardTable title="Günlük Liderlik Tablosu" entries={daily} highlightUserId={user?.id} namesById={namesById} />
        <LeaderboardTable title="Haftalık Liderlik Tablosu" entries={weekly} highlightUserId={user?.id} namesById={namesById} />
      </div>
    </div>
  );
}

function LeaderboardTable({
  title,
  entries,
  highlightUserId,
  namesById,
}: {
  title: string;
  entries: LeaderboardEntry[];
  highlightUserId?: string;
  namesById: Map<string, string>;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>Henüz veri yok.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Kullanıcı</th>
              <th>Puan</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.userId} style={e.userId === highlightUserId ? { background: '#eef2ff' } : undefined}>
                <td>{e.rank}</td>
                <td>{e.userId === highlightUserId ? 'Siz' : namesById.get(e.userId) ?? e.userId.slice(0, 8)}</td>
                <td>{e.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
