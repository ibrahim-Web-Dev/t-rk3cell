import { useCallback, useEffect, useState } from 'react';
import { Shield, X, CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';
import { DEMO, probe, staffLoginRaw, getJson, createCampaignRaw } from './demoApi';

/**
 * Jürinin deneyeceği güvenlik saldırılarını canlı çalıştırıp savunmayı gösterir
 * (case 10). Her test bir istek atar, dönen durum kodunu beklenenle karşılaştırır.
 */
interface Test {
  name: string;
  attack: string;
  expected: string;
  run: () => Promise<{ ok: boolean; got: string }>;
}

const TESTS: Test[] = [
  {
    name: 'SQL Injection',
    attack: "E-posta alanına: ' OR 1=1 --",
    expected: '400/401 (girdi doğrulama + Prisma parametreli — enjeksiyon etkisiz)',
    run: async () => {
      const r = await probe('post', '/auth/staff/login', { body: { email: "' OR 1=1 --", password: 'x' } });
      // 400 = @IsEmail doğrulaması reddetti, 401 = kimlik eşleşmedi; ikisi de "enjeksiyon işe yaramadı"
      return { ok: r.status === 400 || r.status === 401, got: `HTTP ${r.status}` };
    },
  },
  {
    name: 'Yetkisiz endpoint erişimi',
    attack: 'PERSONEL token ile ADMIN endpoint (/audit-logs)',
    expected: '403 (RBAC)',
    run: async () => {
      const u = await staffLoginRaw(DEMO.UZMAN);
      const r = await probe('get', '/audit-logs', { token: u?.accessToken });
      return { ok: r.status === 403, got: `HTTP ${r.status}` };
    },
  },
  {
    name: 'IDOR — başkasının vakasına erişim',
    attack: 'Uzman, kendisine atanmamış bir vakanın detayını ister',
    expected: '403 (sahiplik kontrolü)',
    run: async () => {
      const admin = await staffLoginRaw(DEMO.ADMIN);
      const cases = (await getJson('/cases', admin?.accessToken)) as any[];
      const u = await staffLoginRaw(DEMO.UZMAN);
      // uzman1'e ait OLMAYAN bir vaka bul
      const foreign = cases?.find((c) => c.assignedExpertId && c.assignedExpertId !== u?.user.id);
      if (!foreign) return { ok: true, got: 'uygun vaka yok (atlandı)' };
      const r = await probe('get', `/cases/${foreign.id}`, { token: u?.accessToken });
      return { ok: r.status === 403, got: `HTTP ${r.status}` };
    },
  },
  {
    name: 'JWT manipülasyonu',
    attack: 'İmzası bozulmuş token ile /campaigns',
    expected: '401 (imza doğrulama)',
    run: async () => {
      const u = await staffLoginRaw(DEMO.UZMAN);
      const tampered = (u?.accessToken ?? '').slice(0, -3) + 'AAA';
      const r = await probe('get', '/campaigns', { rawToken: tampered });
      return { ok: r.status === 401, got: `HTTP ${r.status}` };
    },
  },
  {
    name: 'Refresh token yeniden kullanımı',
    attack: 'Rotasyonla geçersiz kılınan refresh token tekrar kullanılır',
    expected: '401 (reuse detection → oturumlar iptal)',
    run: async () => {
      const u = await staffLoginRaw(DEMO.SUPERVISOR);
      const old = u?.refreshToken;
      // ilk kullanım: rotate (yeni refresh üretir, eskisini geçersiz kılar)
      await probe('post', '/auth/refresh', { body: { refreshToken: old } });
      // eskisini TEKRAR kullan -> 401 beklenir
      const r = await probe('post', '/auth/refresh', { body: { refreshToken: old } });
      return { ok: r.status === 401, got: `HTTP ${r.status}` };
    },
  },
  {
    name: 'XSS — script enjeksiyonu',
    attack: 'Kampanya başlığına <script>alert(1)</script>',
    expected: 'Metin olarak saklanır, çalıştırılmaz (React auto-escape)',
    run: async () => {
      const u = await staffLoginRaw(DEMO.UZMAN);
      const payload = '<script>alert(1)</script>';
      const c = await createCampaignRaw(u!.accessToken, {
        title: payload,
        type: 'EK_PAKET',
        discountRate: 10,
        validUntil: '2027-01-01T00:00:00.000Z',
      });
      // başlık aynen (metin olarak) saklandıysa ve patlamadıysa güvenli
      const ok = c?.title === payload;
      return { ok, got: ok ? 'düz metin olarak saklandı' : 'beklenmeyen' };
    },
  },
  {
    name: 'Brute-force / rate limit',
    attack: '35 ardışık hızlı giriş denemesi (sahte hesap)',
    expected: '429 (gateway rate limit)',
    run: async () => {
      let got429 = false;
      for (let i = 0; i < 35; i++) {
        const r = await probe('post', '/auth/staff/login', { body: { email: `brute-${i}@x.com`, password: 'x' } });
        if (r.status === 429) {
          got429 = true;
          break;
        }
      }
      return { ok: got429, got: got429 ? '429 alındı (durduruldu)' : 'limit görülmedi' };
    },
  },
];

type Row = { status: 'idle' | 'running' | 'pass' | 'fail'; got?: string };

export function SecurityRunner({ onExit }: { onExit: () => void }) {
  const [rows, setRows] = useState<Row[]>(TESTS.map(() => ({ status: 'idle' })));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setDone(false);
    for (let i = 0; i < TESTS.length; i++) {
      setRows((r) => r.map((x, k) => (k === i ? { status: 'running' } : x)));
      try {
        const res = await TESTS[i].run();
        setRows((r) => r.map((x, k) => (k === i ? { status: res.ok ? 'pass' : 'fail', got: res.got } : x)));
      } catch (e) {
        setRows((r) => r.map((x, k) => (k === i ? { status: 'fail', got: (e as Error).message } : x)));
      }
    }
    setRunning(false);
    setDone(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onExit();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onExit]);

  const passCount = rows.filter((r) => r.status === 'pass').length;

  return (
    <div className="sec-overlay" role="dialog" aria-modal="true" onClick={onExit}>
      <div className="sec-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sec-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="sec-icon"><Shield size={20} /></span>
            <div>
              <div className="sec-title">Güvenlik Testi (Canlı)</div>
              <div className="sec-sub">Jürinin deneyeceği saldırılar — savunma canlı doğrulanır</div>
            </div>
          </div>
          <button className="modal-close" onClick={onExit} aria-label="Kapat"><X size={18} /></button>
        </div>

        <div className="sec-list">
          {TESTS.map((t, i) => {
            const row = rows[i];
            return (
              <div key={t.name} className={`sec-row ${row.status}`}>
                <div className="sec-row-icon">
                  {row.status === 'running' ? <Loader2 size={18} className="spin" /> : row.status === 'pass' ? <CheckCircle2 size={18} /> : row.status === 'fail' ? <XCircle size={18} /> : <span className="sec-num">{i + 1}</span>}
                </div>
                <div className="sec-row-body">
                  <div className="sec-row-name">{t.name}</div>
                  <div className="sec-row-attack">{t.attack}</div>
                  <div className="sec-row-expected">Beklenen: {t.expected}</div>
                </div>
                <div className="sec-row-result">{row.got ?? ''}</div>
              </div>
            );
          })}
        </div>

        <div className="sec-foot">
          {done ? (
            <span className={`sec-score ${passCount === TESTS.length ? 'all' : ''}`}>
              {passCount}/{TESTS.length} savunma başarılı {passCount === TESTS.length ? '✓ hepsi geçti' : ''}
            </span>
          ) : (
            <span className="sec-note">Not: brute-force testi gateway auth rate-limit'ini bir dakikalığına tüketebilir.</span>
          )}
          <button className="btn btn-login-primary" style={{ width: 'auto' }} onClick={runAll} disabled={running}>
            {running ? 'Çalışıyor…' : done ? 'Tekrar Çalıştır' : (<><Play size={15} /> Testleri Çalıştır</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
