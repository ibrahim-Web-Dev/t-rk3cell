import { useEffect, useState } from 'react';

function formatHms(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Saniyelik canlı SLA sayacı. Yalnızca bu bileşen re-render olur - tablo/liste
 * ekranlarında bunun yerine dakika hassasiyetli statik metin kullanılmalıdır
 * (bkz. frontend tasarım dokümanı §12.3 performans notu).
 */
export function SlaCountdown({ dueAt, completedAt }: { dueAt: string; completedAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (completedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [completedAt]);

  if (completedAt) {
    return <span className="badge-pill pill-success">Tamamlandı</span>;
  }

  const remainingMs = new Date(dueAt).getTime() - now;
  const breached = remainingMs <= 0;

  return (
    <span
      className={`badge-pill ${breached ? 'pill-danger' : 'pill-info'}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-live="polite"
    >
      {breached ? `SLA aşıldı (+${formatHms(-remainingMs)})` : formatHms(remainingMs) + ' kaldı'}
    </span>
  );
}
