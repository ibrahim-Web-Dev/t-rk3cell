import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AuditLogEntry, listAuditLogs } from '../../api/auditApi';
import { apiErrorMessage } from '../../api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import {
  AUDIT_CATEGORY_META,
  AUDIT_CATEGORY_ORDER,
  AuditCategory,
  auditActionLabel,
  categorizeAudit,
} from '../../shared/auditMeta';

type ResultFilter = 'all' | 'SUCCESS' | 'FAILURE';

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | 'all'>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [query, setQuery] = useState('');

  function load() {
    setError(null);
    setLogs(null);
    listAuditLogs()
      .then(setLogs)
      .catch((err) => setError(apiErrorMessage(err, 'Audit log yüklenemedi')));
  }

  useEffect(load, []);

  // Her kayda kategorisini bir kez ekle.
  const decorated = useMemo(
    () => (logs ?? []).map((log) => ({ ...log, category: categorizeAudit(log.action, log.result) })),
    [logs],
  );

  // Hangi kategoriler mevcut + kaçar tane (renkli çipler + sayaç için).
  const categoryCounts = useMemo(() => {
    const counts = new Map<AuditCategory, number>();
    for (const log of decorated) counts.set(log.category, (counts.get(log.category) ?? 0) + 1);
    return counts;
  }, [decorated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return decorated.filter((log) => {
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
      if (resultFilter !== 'all' && log.result !== resultFilter) return false;
      if (q) {
        const haystack = `${log.userLabel ?? log.userId ?? ''} ${log.action} ${log.detail ?? ''} ${log.ip ?? ''}`.toLocaleLowerCase('tr');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [decorated, categoryFilter, resultFilter, query]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!logs) return <LoadingSpinner label="Audit log yükleniyor..." />;
  if (logs.length === 0) return <EmptyState message="Henüz audit log kaydı yok." />;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Audit Log</h2>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          {filtered.length} / {decorated.length} kayıt
        </span>
      </div>

      {/* Türe göre renkli filtre çipleri */}
      <div className="audit-filter-row">
        <button
          type="button"
          className={`audit-chip ${categoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          Tümü <span className="audit-chip-count">{decorated.length}</span>
        </button>
        {AUDIT_CATEGORY_ORDER.filter((c) => categoryCounts.has(c)).map((c) => {
          const meta = AUDIT_CATEGORY_META[c];
          return (
            <button
              type="button"
              key={c}
              className={`audit-chip ${meta.pill} ${categoryFilter === c ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === c ? 'all' : c)}
            >
              {meta.label} <span className="audit-chip-count">{categoryCounts.get(c)}</span>
            </button>
          );
        })}
      </div>

      {/* Sonuç filtresi + arama */}
      <div className="audit-filter-row">
        <div className="segmented audit-result-seg">
          {(['all', 'SUCCESS', 'FAILURE'] as ResultFilter[]).map((r) => (
            <button
              type="button"
              key={r}
              className={resultFilter === r ? 'active' : ''}
              onClick={() => setResultFilter(r)}
            >
              {r === 'all' ? 'Tümü' : r === 'SUCCESS' ? 'Başarılı' : 'Başarısız'}
            </button>
          ))}
        </div>
        <div className="audit-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı, işlem, detay veya IP ara…"
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th>Tür</th>
              <th>İşlem</th>
              <th>IP</th>
              <th>Sonuç</th>
              <th>Detay</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const meta = AUDIT_CATEGORY_META[log.category];
              return (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                  <td>{log.userLabel ?? (log.userId ? log.userId.slice(0, 8) : '-')}</td>
                  <td>
                    <span className={`badge-pill ${meta.pill}`}>{meta.label}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{auditActionLabel(log.action)}</td>
                  <td>{log.ip ?? '-'}</td>
                  <td>
                    <span className={`badge-pill ${log.result === 'SUCCESS' ? 'pill-success' : 'pill-danger'}`}>
                      {log.result === 'SUCCESS' ? 'Başarılı' : 'Başarısız'}
                    </span>
                  </td>
                  <td>{log.detail ?? '-'}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 20 }}>
                  Filtreye uyan kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
