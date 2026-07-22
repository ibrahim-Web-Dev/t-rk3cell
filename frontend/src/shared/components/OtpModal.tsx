import { FormEvent, useEffect, useState } from 'react';
import { MessageSquareText, X } from 'lucide-react';

const OTP_TTL_SECONDS = 5 * 60; // identity-service auth.service.ts OTP_TTL_MS ile aynı (5dk)

function maskGsm(gsm: string): string {
  const digits = gsm.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) return gsm;
  return `${digits.slice(0, 3)} *** ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
}

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface OtpModalProps {
  gsm: string;
  sentAt: number;
  code: string;
  loading: boolean;
  error: string | null;
  onCodeChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onResend: () => void;
  onClose: () => void;
}

export function OtpModal({
  gsm,
  sentAt,
  code,
  loading,
  error,
  onCodeChange,
  onSubmit,
  onResend,
  onClose,
}: OtpModalProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sentAt]);

  const remainingSeconds = Math.max(0, OTP_TTL_SECONDS - Math.floor((now - sentAt) / 1000));
  const expired = remainingSeconds <= 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="otp-modal-title" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>

        <div className="modal-icon">
          <MessageSquareText size={26} strokeWidth={2} />
        </div>
        <h2 id="otp-modal-title" className="modal-title">
          SMS Doğrulama
        </h2>
        <p className="modal-subtitle">
          <strong>{maskGsm(gsm)}</strong> numaralı telefonunuza gönderilen doğrulama kodunu girin.
        </p>

        {error && (
          <div className="state-block state-error" style={{ padding: '10px 0', textAlign: 'left', alignItems: 'flex-start' }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label>SMS Kodu (simülasyon: 1234)</label>
            <input
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              required
              maxLength={4}
              autoFocus
              inputMode="numeric"
              className="otp-code-input"
            />
          </div>

          <div className="otp-timer" aria-live="polite">
            {expired ? (
              <span className="otp-timer-expired">Kodun süresi doldu, yeni kod isteyin.</span>
            ) : (
              <span>
                Kalan süre: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMmSs(remainingSeconds)}</strong>
              </span>
            )}
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            Doğrula
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={!expired || loading}
            onClick={onResend}
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          >
            Kodu Tekrar Gönder
          </button>
        </form>
      </div>
    </div>
  );
}
