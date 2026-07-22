import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

/**
 * Hesap kilidi için canlı geri sayım. Backend 423 yanıtında `lockedUntil`
 * (ISO) döndürür; burada her saniye kalan süre mm:ss olarak güncellenir.
 * Süre dolduğunda onExpire çağrılır (form tekrar denenebilir hale gelir).
 */
export function LockCountdown({ lockedUntil, onExpire }: { lockedUntil: string; onExpire?: () => void }) {
  const target = new Date(lockedUntil).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remainingMs = Math.max(0, target - now);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');

  useEffect(() => {
    if (remainingMs <= 0) onExpire?.();
  }, [remainingMs, onExpire]);

  return (
    <div className="lock-banner" role="alert">
      <Lock size={18} />
      <div>
        <div className="lock-title">Hesap geçici olarak kilitlendi</div>
        <div className="lock-sub">
          5 başarısız giriş denemesi. Kalan süre:{' '}
          <strong className="lock-timer" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {mm}:{ss}
          </strong>
        </div>
      </div>
    </div>
  );
}
