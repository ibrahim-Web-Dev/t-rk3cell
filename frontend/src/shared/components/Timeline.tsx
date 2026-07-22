import { STATUS_LABELS } from '../labels';

export interface TimelineEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  createdAt: string;
}

function actorLabel(changedBy: string): string {
  if (changedBy === 'system-ai') return 'AI (otomatik atama)';
  if (changedBy === 'system-scheduler') return 'Sistem (zamanlanmış görev)';
  return changedBy.length > 12 ? `${changedBy.slice(0, 8)}…` : changedBy;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Henüz durum değişikliği yok.</p>;
  }

  return (
    <ul className="timeline">
      {entries.map((entry) => (
        <li className="timeline-item" key={entry.id}>
          <span className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-title">
              {STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus} → {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
            </div>
            <div className="timeline-meta">
              {new Date(entry.createdAt).toLocaleString('tr-TR')} · {actorLabel(entry.changedBy)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
