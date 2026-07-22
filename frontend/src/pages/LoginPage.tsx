import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Smartphone, Sparkles, UserCog } from 'lucide-react';
import { requestOtp, staffLogin, verifyOtp } from '../api/authApi';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../homePathForRole';
import { OtpModal } from '../shared/components/OtpModal';

type Tab = 'subscriber' | 'staff';
type SubscriberMode = 'login' | 'register';
type RegisterStep = 'phone' | 'profile';

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('subscriber');
  const [subscriberMode, setSubscriberMode] = useState<SubscriberMode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // subscriber flow state
  const [gsm, setGsm] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState(0);
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // staff flow state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function selectSubscriberMode(mode: SubscriberMode) {
    setSubscriberMode(mode);
    setRegisterStep('phone');
    setOtpSent(false);
    setCode('');
    setFirstName('');
    setLastName('');
    setRegEmail('');
    setError(null);
  }

  function handlePhoneNext(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRegisterStep('profile');
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestOtp(gsm);
      setCode('');
      setOtpSentAt(Date.now());
      setOtpSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'OTP gönderilemedi'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setLoading(true);
    try {
      await requestOtp(gsm);
      setCode('');
      setOtpSentAt(Date.now());
    } catch (err) {
      setError(apiErrorMessage(err, 'OTP gönderilemedi'));
    } finally {
      setLoading(false);
    }
  }

  function handleCloseOtpModal() {
    setOtpSent(false);
    setCode('');
    setError(null);
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
        email: subscriberMode === 'register' && regEmail ? regEmail : undefined,
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
      <div className="login-brand-header">
        <span className="brand-mark">
          <Sparkles size={26} strokeWidth={2.4} />
        </span>
      </div>

      <div className="login-card">
        <div className="login-card-header">
          <BadgeCheck size={22} strokeWidth={2.4} className="login-check-icon" />
          <span className="login-wordmark">CampaignCell</span>
        </div>

        {subscriberMode === 'register' && tab === 'subscriber' && (
          <div className="login-card-subtitle">Devam edebilmek için kayıt olmanız gerekmektedir.</div>
        )}

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

        {tab === 'subscriber' && subscriberMode === 'login' && (
          <form onSubmit={handleRequestOtp}>
            <div className="form-field">
              <label>GSM Numarası</label>
              <input value={gsm} onChange={(e) => setGsm(e.target.value)} placeholder="5551234567" required />
            </div>
            <button className="btn btn-login-primary" type="submit" disabled={loading}>
              Giriş Yap
            </button>
          </form>
        )}

        {tab === 'subscriber' && subscriberMode === 'register' && registerStep === 'phone' && (
          <>
            <form onSubmit={handlePhoneNext}>
              <div className="form-field">
                <label>GSM Numarası</label>
                <input value={gsm} onChange={(e) => setGsm(e.target.value)} placeholder="5551234567" required />
              </div>
              <button className="btn btn-login-primary" type="submit">
                Devam Et
              </button>
            </form>
            <button type="button" className="login-back-link" onClick={() => selectSubscriberMode('login')}>
              Zaten hesabınız var mı? Giriş yapın
            </button>
          </>
        )}

        {tab === 'subscriber' && subscriberMode === 'register' && registerStep === 'profile' && (
          <>
            <form onSubmit={handleRequestOtp}>
              <div className="form-field">
                <label>Ad</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Soyad</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>GSM Numarası</label>
                <input value={gsm} disabled />
              </div>
              <div className="form-field">
                <label>E-posta (opsiyonel)</label>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="ornek@mail.com" />
              </div>
              <button className="btn btn-login-primary" type="submit" disabled={loading}>
                Kayıt Ol
              </button>
            </form>
            <button type="button" className="login-back-link" onClick={() => setRegisterStep('phone')}>
              GSM numarasını değiştir
            </button>
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
            <button className="btn btn-login-primary" type="submit" disabled={loading}>
              Giriş Yap
            </button>
          </form>
        )}

        <div className="demo-hint">
          <strong>Demo hesapları:</strong> Personel için <code>uzman1@campaigncell.com</code> / <code>Password1!</code>
          {' '}· Abone için GSM <code>5551234567</code>, OTP <code>1234</code>
        </div>
      </div>

      {tab === 'subscriber' && subscriberMode === 'login' && (
        <button type="button" className="btn-login-secondary" onClick={() => selectSubscriberMode('register')}>
          Yeni Hesap Oluştur
        </button>
      )}

      {otpSent && (
        <OtpModal
          gsm={gsm}
          sentAt={otpSentAt}
          code={code}
          loading={loading}
          error={error}
          onCodeChange={setCode}
          onSubmit={handleVerifyOtp}
          onResend={handleResendOtp}
          onClose={handleCloseOtpModal}
        />
      )}
    </div>
  );
}
