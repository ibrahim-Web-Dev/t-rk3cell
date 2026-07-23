import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { staffLogin, requestOtp, verifyOtp } from '../api/authApi';

type TourRole = 'PERSONEL' | 'SUPERVISOR' | 'ADMIN' | 'SUBSCRIBER';

interface TourStep {
  role: TourRole;
  path: string;
  title: string;
  say: string;
}

/**
 * Jüri için rehberli sunum turu. Enter/→ ile ilerler, ← ile geri gider, Esc ile
 * çıkar. Her adımda gereken rolle otomatik giriş yapıp ilgili sayfaya geçer ve
 * altta "ne gösteriliyor / ne söyle" başlığını gösterir. Zorunlu demo
 * senaryosunun (11.3) ve ana ekranların sırasını takip eder.
 */
const TOUR: TourStep[] = [
  { role: 'PERSONEL', path: '/expert/campaigns/new', title: 'Kampanya Oluşturma', say: 'Kampanya uzmanı yeni kampanya oluşturur ve bir segmente hedefler. "Oluştur" deyince AI otomatik tetiklenir: segment + öncelik + dönüşüm tahmini + öneri skoru. RISKLI_KAYIP her zaman en az YÜKSEK öncelik alır.' },
  { role: 'PERSONEL', path: '/expert/campaigns', title: 'Kampanyalarım', say: 'Oluşturulan tüm kampanyalar; AI segmenti, önceliği, dönüşüm tahmini. Dönüşüm %40 eşiğinin altındaysa optimizasyon vakası açılır, üstündeyse "sağlıklı" kalır.' },
  { role: 'PERSONEL', path: '/expert/cases', title: 'Vakalarım', say: 'Uzmana atanan optimizasyon vakaları, öncelik sıralı ve canlı SLA sayacıyla. Uzman buradan vakayı açıp state machine ile ilerletir (başla → A/B testi → tamamla).' },
  { role: 'SUPERVISOR', path: '/cases-overview', title: 'Tüm Vakalar', say: 'Süpervizör tüm vakaları görür: AI hangi vakayı hangi uzmana atadı (uzmanlık×0.5 + boşluk×0.3 + performans×0.2). Tamamlanan vakaları "Yayınla" ile onaylayıp yayına alır.' },
  { role: 'SUPERVISOR', path: '/supervisor/queue', title: 'Bekleyen Kuyruk', say: 'BELİRSİZ veya kapasite bekleyen vakalar. "Uzman Ata" drawerında her adayın kapasite barı, performansı ve AI öneri skoru görünür; manuel atama yapılabilir.' },
  { role: 'SUPERVISOR', path: '/supervisor/dashboard', title: 'Süpervizör Dashboard', say: 'Operasyonel KPI\'lar: segment dağılımı, dönüşüm trendi, SLA uyum oranı + aşan vakalar, AI doğruluk metriği ve uzman performansı — tek ekranda.' },
  { role: 'SUPERVISOR', path: '/supervisor/ai-insights', title: 'AI İçgörüleri', say: 'AI doğruluk oranı (doğru/toplam × 100), kategori bazlı kırılım ve override tablosu — hangi tahmin kim tarafından düzeltildi. Model isabeti buradan izlenir.' },
  { role: 'PERSONEL', path: '/expert/profile', title: 'Gamification', say: 'Puan, seviye (Bronz→Gümüş→Altın→Platin), kilitli/açık rozetler ve günlük/haftalık liderlik. Puanlar Campaign Service\'ten RabbitMQ event\'iyle geldi — servisler doğrudan çağrışmıyor.' },
  { role: 'SUBSCRIBER', path: '/subscriber/offers', title: 'Abone Teklifleri', say: 'Abonenin kişiselleştirilmiş teklifleri (AI öneri skoru ≥ 0.60 olanlar). Kabul / İlgilenmiyorum yanıtı + tek seferlik 1-5 yıldız memnuniyet puanı.' },
  { role: 'ADMIN', path: '/admin/audit-log', title: 'Audit Log', say: 'Merkezi denetim izi: renkli tür filtreleri, başarısız/403 girişimleri, rol değişikliği, kampanya silme — hepsi kim / ne / ne zaman / IP / sonuç ile. Güvenlik testine hazır.' },
];

const DEMO_EMAIL: Record<Exclude<TourRole, 'SUBSCRIBER'>, string> = {
  PERSONEL: 'uzman1@campaigncell.com',
  SUPERVISOR: 'supervisor@campaigncell.com',
  ADMIN: 'admin@campaigncell.com',
};

interface PresentationContextValue {
  start: () => void;
  active: boolean;
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

export function usePresentation(): PresentationContextValue {
  const ctx = useContext(PresentationContext);
  if (!ctx) throw new Error('usePresentation must be used within PresentationProvider');
  return ctx;
}

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const start = useCallback(() => setActive(true), []);
  return (
    <PresentationContext.Provider value={{ start, active }}>
      {children}
      {active && <PresentationRunner onExit={() => setActive(false)} />}
    </PresentationContext.Provider>
  );
}

function PresentationRunner({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const currentRole = useRef<TourRole | null>(null);

  const applyStep = useCallback(
    async (i: number) => {
      const step = TOUR[i];
      setLoading(true);
      try {
        if (currentRole.current !== step.role) {
          if (step.role === 'SUBSCRIBER') {
            await requestOtp('5551234567', 'login');
            const r = await verifyOtp({ gsm: '5551234567', code: '1234', intent: 'login' });
            login({ accessToken: r.accessToken, refreshToken: r.refreshToken }, r.user);
          } else {
            const r = await staffLogin({ email: DEMO_EMAIL[step.role], password: 'Password1!' });
            login({ accessToken: r.accessToken, refreshToken: r.refreshToken }, r.user);
          }
          currentRole.current = step.role;
        }
        navigate(step.path);
      } finally {
        setLoading(false);
      }
    },
    [login, navigate],
  );

  // İlk adım + her index değişiminde ilgili rolle giriş yap ve sayfaya geç.
  useEffect(() => {
    applyStep(index);
  }, [index, applyStep]);

  const next = useCallback(() => setIndex((i) => (i < TOUR.length - 1 ? i + 1 : i)), []);
  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);

  // Klavye: Enter/Space/→ ileri, ← geri, Esc çıkış.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (index === TOUR.length - 1) onExit();
        else next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, next, prev, onExit]);

  const step = TOUR[index];
  const isLast = index === TOUR.length - 1;

  return (
    <div className="present-bar" role="dialog" aria-label="Sunum modu">
      <div className="present-progress">
        {TOUR.map((_, i) => (
          <span key={i} className={`present-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}`} />
        ))}
      </div>

      <div className="present-body">
        <div className="present-step-no">
          {index + 1}/{TOUR.length}
        </div>
        <div className="present-text">
          <div className="present-title">
            {step.title}
            <span className={`present-role role-${step.role}`}>{roleLabel(step.role)}</span>
            {loading && <span className="present-loading">geçiliyor…</span>}
          </div>
          <div className="present-say">{step.say}</div>
        </div>
        <div className="present-controls">
          <button className="present-btn" onClick={prev} disabled={index === 0} title="Geri (←)">
            <ChevronLeft size={18} />
          </button>
          <button className="present-btn primary" onClick={() => (isLast ? onExit() : next())} title="İleri (Enter)">
            {isLast ? 'Bitir' : 'İleri'} <ChevronRight size={18} />
          </button>
          <button className="present-btn" onClick={onExit} title="Çıkış (Esc)">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="present-hint">
        <kbd>Enter</kbd> ileri · <kbd>←</kbd> geri · <kbd>Esc</kbd> çıkış
      </div>
    </div>
  );
}

function roleLabel(role: TourRole): string {
  return role === 'PERSONEL' ? 'Uzman' : role === 'SUPERVISOR' ? 'Süpervizör' : role === 'ADMIN' ? 'Admin' : 'Abone';
}

/** Login ekranındaki başlat butonu. */
export function PresentationStartButton() {
  const { start } = usePresentation();
  return (
    <button type="button" className="present-start-btn" onClick={start}>
      <Play size={15} /> Sunum Modu
    </button>
  );
}
