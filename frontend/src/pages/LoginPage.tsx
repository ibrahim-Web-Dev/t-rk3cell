import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Smartphone, Sparkles, Trophy, TrendingUp, UserCog, UserPlus } from 'lucide-react';
import { requestOtp, staffLogin, verifyOtp } from '../api/authApi';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../homePathForRole';

type Tab = 'subscriber' | 'staff';
type SubscriberMode = 'login' | 'register';

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('subscriber');
  const [subscriberMode, setSubscriberMode] = useState<SubscriberMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // subscriber flow state
  const [gsm, setGsm] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // staff flow state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function selectSubscriberMode(mode: SubscriberMode) {
    setSubscriberMode(mode);
    setOtpSent(false);
    setCode('');
    setError(null);
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestOtp(gsm);
      setOtpSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'OTP gönderilemedi'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp({
        gsm,
        code,
        firstName: subscriberMode === 'register' ? firstName : undefined,
        lastName: subscriberMode === 'register' ? lastName : undefined,
      });
      login({ accessToken: result.accessToken, refreshToken: result.refreshToken }, result.user);
      navigate(homePathForRole(result.user.role));
    } catch (err) {
      setError(apiErrorMessage(err, 'Doğrulama başarısız'));
    } finally {
      setLoading(false);
    }
  }

  async function handleStaffLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await staffLogin({ email, password });
      login({ accessToken: result.accessToken, refreshToken: result.refreshToken }, result.user);
      navigate(homePathForRole(result.user.role));
    } catch (err) {
      setError(apiErrorMessage(err, 'Giriş başarısız'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-hero-badge">
          <Sparkles size={22} strokeWidth={2.2} /> CampaignCell
        </div>
        <h1>
          Doğru teklif,
          <br />
          doğru kişiye.
        </h1>
        <p>
          Turkcell abonelerine yapay zeka destekli, kişiselleştirilmiş kampanya ve öneri platformu. Doğru zamanda
          doğru teklifi sunar, uzman ekibinizi akıllıca yönlendirir.
        </p>
        <ul className="login-hero-features">
          <li>
            <span className="icon-chip">
              <TrendingUp size={16} />
            </span>
            Akıllı segment ve dönüşüm tahmini
          </li>
          <li>
            <span className="icon-chip">
              <ShieldCheck size={16} />
            </span>
            Güvenli, rol bazlı erişim kontrolü
          </li>
          <li>
            <span className="icon-chip">
              <Trophy size={16} />
            </span>
            Gerçek zamanlı puan ve rozet sistemi
          </li>
        </ul>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-card-title">Hoş geldiniz</div>
          <div className="login-card-subtitle">Devam etmek için giriş yapın</div>

          <div className="segmented">
            <button type="button" className={tab === 'subscriber' ? 'active' : ''} onClick={() => setTab('subscriber')}>
              <Smartphone size={15} /> Abone
            </button>
            <button type="button" className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}>
              <UserCog size={15} /> Personel / Yönetici
            </button>
          </div>

          {error && (
            <div className="state-block state-error" style={{ padding: '10px 0', textAlign: 'left', alignItems: 'flex-start' }}>
              ⚠ {error}
            </div>
          )}

          {tab === 'subscriber' && (
            <>
              <div className="segmented" style={{ marginBottom: 20 }}>
                <button
                  type="button"
                  className={subscriberMode === 'login' ? 'active' : ''}
                  onClick={() => selectSubscriberMode('login')}
                >
                  <LogIn size={15} /> Giriş Yap
                </button>
                <button
                  type="button"
                  className={subscriberMode === 'register' ? 'active' : ''}
                  onClick={() => selectSubscriberMode('register')}
                >
                  <UserPlus size={15} /> Kayıt Ol
                </button>
              </div>

              {!otpSent && (
                <form onSubmit={handleRequestOtp}>
                  <div className="form-field">
                    <label>GSM Numarası</label>
                    <input value={gsm} onChange={(e) => setGsm(e.target.value)} placeholder="5551234567" required />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                    OTP Gönder
                  </button>
                </form>
              )}

              {otpSent && (
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-field">
                    <label>OTP Kodu (simülasyon: 1234)</label>
                    <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={4} />
                  </div>
                  {subscriberMode === 'register' && (
                    <>
                      <div className="form-field">
                        <label>Ad</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      </div>
                      <div className="form-field">
                        <label>Soyad</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                      </div>
                    </>
                  )}
                  <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                    {subscriberMode === 'register' ? 'Kayıt Ol' : 'Giriş Yap'}
                  </button>
                </form>
              )}
            </>
          )}

          {tab === 'staff' && (
            <form onSubmit={handleStaffLogin}>
              <div className="form-field">
                <label>E-posta</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Şifre</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                Giriş Yap
              </button>
            </form>
          )}

          <div className="demo-hint">
            <strong>Demo hesapları:</strong> Personel için <code>uzman1@campaigncell.com</code> / <code>Password1!</code>
            {' '}· Abone için GSM <code>5551234567</code>, OTP <code>1234</code>
          </div>
        </div>
      </div>
    </div>
  );
}
