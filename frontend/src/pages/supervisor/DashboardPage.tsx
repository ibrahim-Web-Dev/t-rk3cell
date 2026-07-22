import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  conversionTrend,
  ConversionTrendRow,
  expertPerformance,
  ExpertPerformanceRow,
  segmentDistribution,
  SegmentDistributionRow,
  slaCompliance,
  SlaCompliance,
} from '../../api/statsApi';
import { accuracyOverall, AccuracyOverall } from '../../api/aiApi';
import { listStaff } from '../../api/usersApi';
import { apiErrorMessage } from '../../api/client';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';
import { SEGMENT_LABELS } from '../../shared/labels';

const SEGMENT_COLORS: Record<string, string> = {
  YUKSEK_DEGER: '#1e5eff',
  RISKLI_KAYIP: '#d3433d',
  YENI_ABONE: '#1a9e5c',
  PASIF: '#8b93a1',
  BELIRSIZ: '#d98a1f',
};

export function DashboardPage() {
  const [segments, setSegments] = useState<SegmentDistributionRow[] | null>(null);
  const [sla, setSla] = useState<SlaCompliance | null>(null);
  const [trend, setTrend] = useState<ConversionTrendRow[] | null>(null);
  const [experts, setExperts] = useState<ExpertPerformanceRow[] | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyOverall | null>(null);
  const [staffNames, setStaffNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    Promise.all([segmentDistribution(), slaCompliance(), conversionTrend(14), expertPerformance(), accuracyOverall(), listStaff()])
      .then(([s, sl, t, e, a, staff]) => {
        setSegments(s);
        setSla(sl);
        setTrend(t);
        setExperts(e);
        setAccuracy(a);
        setStaffNames(new Map(staff.map((u) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id.slice(0, 8)])));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Dashboard yüklenemedi')));
  }

  useEffect(load, []);

  const expertsWithNames = useMemo(
    () => (experts ?? []).map((e) => ({ ...e, expertName: staffNames.get(e.expertId) ?? e.expertId.slice(0, 8) })),
    [experts, staffNames],
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!segments || !sla || !trend || !experts || !accuracy) return <LoadingSpinner label="Dashboard yükleniyor..." />;

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="value">%{sla.complianceRate}</div>
          <div className="label">SLA Uyum Oranı</div>
        </div>
        <div className="stat-tile">
          <div className="value">{sla.breached}</div>
          <div className="label">SLA Aşan Vaka</div>
        </div>
        <div className="stat-tile">
          <div className="value">{accuracy.accuracyRate != null ? `%${accuracy.accuracyRate}` : '-'}</div>
          <div className="label">AI Doğruluk Oranı ({accuracy.total} tahmin)</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Segment Dağılımı</h3>
          {segments.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={segments} dataKey="count" nameKey="segment" outerRadius={90} label={(d) => SEGMENT_LABELS[d.segment] ?? d.segment}>
                  {segments.map((s) => (
                    <Cell key={s.segment} fill={SEGMENT_COLORS[s.segment] ?? '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(value: string) => SEGMENT_LABELS[value] ?? value} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3>Dönüşüm Trendi (son 14 gün)</h3>
          {trend.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="conversionRate" stroke="#1e5eff" name="Dönüşüm Oranı (%)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Uzman Performansı</h3>
        {experts.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Henüz tamamlanan vaka yok.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={expertsWithNames}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="expertName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completedCount" fill="#1a9e5c" name="Tamamlanan Vaka" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Uzman</th>
              <th>Tamamlanan</th>
              <th>Ort. Dönüşüm Artışı</th>
              <th>Ort. Süre (saat)</th>
            </tr>
          </thead>
          <tbody>
            {expertsWithNames.map((e) => (
              <tr key={e.expertId}>
                <td>{e.expertName}</td>
                <td>{e.completedCount}</td>
                <td>{e.averageConversionLift != null ? `%${Math.round(e.averageConversionLift * 100)}` : '-'}</td>
                <td>{e.averageDurationHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
