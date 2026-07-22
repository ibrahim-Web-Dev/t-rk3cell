import { useEffect, useState } from 'react';
import { AuditLogEntry, listAuditLogs } from '../../api/auditApi';
import { apiErrorMessage } from '../../api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setLogs(null);
    listAuditLogs()
      .then(setLogs)
      .catch((err) => setError(apiErrorMessage(err, 'Audit log yüklenemedi')));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!logs) return <LoadingSpinner label="Audit log yükleniyor..." />;
  if (logs.length === 0) return <EmptyState message="Henüz audit log kaydı yok." />;

  return (
    <div className="card">
      <h2>Audit Log</h2>
      <table>
        <thead>
          <tr>
            <th>Zaman</th>
            <th>Kullanıcı</th>
            <th>İşlem</th>
            <th>IP</th>
            <th>Sonuç</th>
            <th>Detay</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
              <td>{log.userId ? log.userId.slice(0, 8) : '-'}</td>
              <td>{log.action}</td>
              <td>{log.ip ?? '-'}</td>
              <td>
                <span className={`badge-pill ${log.result === 'SUCCESS' ? 'pill-success' : 'pill-danger'}`}>{log.result}</span>
              </td>
              <td>{log.detail ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
