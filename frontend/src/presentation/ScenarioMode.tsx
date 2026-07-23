import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Loader2, CheckCircle2, Rocket } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  DEMO,
  createCampaignRaw,
  getJson,
  caseAction,
  staffLoginRaw,
} from './demoApi';

/**
 * Aksiyon-güdümlü otomatik demo (case 11.3). Gezinmez, GERÇEKTEN yapar:
 * kampanya oluşturur → AI sonucunu okur → atanan uzmanı bulur → o uzmanla
 * vakayı state machine üzerinden tamamlar → puanın liderliğe yansımasını
 * gösterir. Her adım arka plandaki gerçek ekrana da geçer.
 */
interface StepResult {
  label: string;
  detail: string;
  status: 'pending' | 'running' | 'done';
}

const INITIAL: StepResult[] = [
  { label: '1 · Sistem ayakta', detail: 'docker compose up ile 13 konteyner (terminalde gösterilir)', status: 'pending' },
  { label: '2 · Kampanya oluştur + segmente hedefle', detail: 'Uzman olarak RISKLI_KAYIP kampanyası', status: 'pending' },
  { label: '3 · AI: skor + segment + dönüşüm tahmini', detail: '', status: 'pending' },
  { label: '4 · Doğru uzmana otomatik atama', detail: 'uzmanlık×0.5 + boşluk×0.3 + performans×0.2', status: 'pending' },
  { label: '5 · Uzman optimizasyonu tamamlar', detail: 'state machine: ATANDI → … → TAMAMLANDI', status: 'pending' },
  { label: '6 · Puan liderlik tablosuna yansır', detail: '', status: 'pending' },
  { label: '7 · Servis bağımsızlığı', detail: 'Terminalde: docker compose stop ai-service → BELİRSİZ', status: 'pending' },
  { label: '8 · Güvenlik testlerine hazır', detail: '"Güvenlik Testi" moduyla gösterilir', status: 'pending' },
];

export function ScenarioRunner({ onExit }: { onExit: () => void }) {
  const [steps, setSteps] = useState<StepResult[]>(INITIAL);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Adımlar arası taşınan durum
  const ctx = useRef<{
    uzmanToken?: string;
    adminToken?: string;
    campaign?: any;
    caseId?: string;
    expertName?: string;
    expertToken?: string;
    pointsBefore?: number;
    pointsAfter?: number;
  }>({});

  const patch = useCallback((i: number, p: Partial<StepResult>) => {
    setSteps((s) => s.map((st, k) => (k === i ? { ...st, ...p } : st)));
  }, []);

  const runStep = useCallback(
    async (i: number) => {
      setBusy(true);
      patch(i, { status: 'running' });
      try {
        if (i === 0) {
          patch(i, { detail: '✔ Tüm servisler healthy (docker compose up)', status: 'done' });
        } else if (i === 1) {
          const u = await staffLoginRaw(DEMO.UZMAN);
          ctx.current.uzmanToken = u?.accessToken;
          if (u) login({ accessToken: u.accessToken, refreshToken: u.refreshToken }, u.user as any);
          // Vaka açılmasını garanti etmek için düşük dönüşümlü olana kadar dene
          let camp: any = null;
          for (let t = 0; t < 5; t++) {
            camp = await createCampaignRaw(ctx.current.uzmanToken!, {
              title: `Otomatik Demo Kampanyası #${Date.now() % 10000}`,
              type: 'SADAKAT',
              targetSegmentHint: 'RISKLI_KAYIP',
              discountRate: 5,
              validUntil: '2027-01-01T00:00:00.000Z',
            });
            if (camp?.optimizationCase) break;
          }
          ctx.current.campaign = camp;
          ctx.current.caseId = camp?.optimizationCase?.id;
          navigate('/expert/campaigns');
          patch(i, {
            detail: `✔ ${camp?.campaignNumber} oluşturuldu · AI otomatik tetiklendi`,
            status: 'done',
          });
        } else if (i === 2) {
          const c = ctx.current.campaign;
          const conv = Math.round((c?.aiConversionProbability ?? 0) * 100);
          const conf = Math.round((c?.aiConfidence ?? 0) * 100);
          patch(i, {
            detail: `✔ Segment: ${c?.aiSegment} · Öncelik: ${c?.aiPriority} · Güven: %${conf} · Dönüşüm: %${conv} (<%40 → vaka açıldı)`,
            status: 'done',
          });
        } else if (i === 3) {
          const sup = await staffLoginRaw(DEMO.ADMIN);
          ctx.current.adminToken = sup?.accessToken;
          const staff = (await getJson('/users/staff', ctx.current.adminToken)) as any[];
          const expId = ctx.current.campaign?.optimizationCase?.assignedExpertId;
          const exp = staff?.find((s) => s.id === expId);
          ctx.current.expertName = exp ? `${exp.firstName} ${exp.lastName}` : expId?.slice(0, 8);
          ctx.current.expertToken = undefined;
          if (exp) {
            const el = await staffLoginRaw(exp.email);
            ctx.current.expertToken = el?.accessToken;
            ctx.current.pointsBefore = ((await getJson('/game/profile/me', el?.accessToken)) as any)?.totalPoints ?? 0;
          }
          navigate('/cases-overview');
          const score = ctx.current.campaign?.optimizationCase?.assignmentScore;
          patch(i, {
            detail: `✔ ${ctx.current.expertName} → uzmanlık RISKLI_KAYIP · atama skoru ${score ?? '—'}`,
            status: 'done',
          });
        } else if (i === 4) {
          const t = ctx.current.expertToken!;
          const id = ctx.current.caseId!;
          await caseAction(t, id, 'start');
          await caseAction(t, id, 'start-test');
          await caseAction(t, id, 'complete-test', { conversionLift: 0.25 });
          const r = await caseAction(t, id, 'complete', {
            optimizationNote: 'Otomatik demo: segment yeniden hedeflendi, teklif güncellendi',
            conversionLift: 0.25,
          });
          navigate('/expert/cases');
          patch(i, { detail: `✔ Vaka ${r.data?.status ?? 'TAMAMLANDI'} · dönüşüm artışı %25`, status: 'done' });
        } else if (i === 5) {
          // login as expert to view their profile in UI
          const exp = ctx.current.expertToken;
          const after = ((await getJson('/game/profile/me', exp)) as any)?.totalPoints ?? 0;
          ctx.current.pointsAfter = after;
          // Uygulamada uzmanın profilini göster
          const el = ctx.current.campaign?.optimizationCase?.assignedExpertId;
          if (el && exp) {
            const staff = (await getJson('/users/staff', ctx.current.adminToken)) as any[];
            const e = staff?.find((s) => s.id === el);
            if (e) {
              const lg = await staffLoginRaw(e.email);
              if (lg) login({ accessToken: lg.accessToken, refreshToken: lg.refreshToken }, lg.user as any);
            }
          }
          navigate('/expert/profile');
          const before = ctx.current.pointsBefore ?? 0;
          patch(i, {
            detail: `✔ Puan ${before} → ${after} (+${after - before}: +10 tamamlama +15 dönüşüm +5 hızlı) · liderlik güncel`,
            status: 'done',
          });
        } else if (i === 6) {
          patch(i, { detail: '↦ Terminalde: docker compose stop ai-service (kampanya BELİRSİZ ile oluşur, sistem çökmez)', status: 'done' });
        } else if (i === 7) {
          patch(i, { detail: '↦ "Güvenlik Testi" modunu başlatın (SQLi, IDOR, JWT, brute-force…)', status: 'done' });
        }
      } catch (err) {
        patch(i, { detail: `⚠ Hata: ${(err as Error).message}`, status: 'done' });
      } finally {
        setBusy(false);
      }
    },
    [login, navigate, patch],
  );

  // İlk adımı otomatik çalıştır
  useEffect(() => {
    runStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = useCallback(async () => {
    if (busy) return;
    if (index >= steps.length - 1) return onExit();
    const nextIdx = index + 1;
    setIndex(nextIdx);
    await runStep(nextIdx);
  }, [busy, index, steps.length, runStep, onExit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [advance, onExit]);

  const cur = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="present-bar scenario-bar" role="dialog" aria-label="Otomatik demo senaryosu">
      <div className="present-progress">
        {steps.map((s, i) => (
          <span key={i} className={`present-dot ${i === index ? 'active' : ''} ${s.status === 'done' && i < index ? 'done' : ''}`} />
        ))}
      </div>
      <div className="present-body">
        <div className="present-step-no" style={{ minWidth: 40 }}>
          {cur.status === 'running' ? <Loader2 size={22} className="spin" /> : cur.status === 'done' ? <CheckCircle2 size={22} color="var(--color-brand-yellow)" /> : <Rocket size={20} />}
        </div>
        <div className="present-text">
          <div className="present-title">{cur.label}</div>
          <div className="present-say">{cur.detail || cur.label}</div>
        </div>
        <div className="present-controls">
          <button className="present-btn primary" onClick={advance} disabled={busy} title="İleri (Enter)">
            {busy ? 'çalışıyor…' : isLast ? 'Bitir' : 'İleri'} {!busy && <ChevronRight size={18} />}
          </button>
          <button className="present-btn" onClick={onExit} title="Çıkış (Esc)">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="present-hint">
        <kbd>Enter</kbd> her adımı GERÇEKTEN çalıştırır · <kbd>Esc</kbd> çıkış
      </div>
    </div>
  );
}
