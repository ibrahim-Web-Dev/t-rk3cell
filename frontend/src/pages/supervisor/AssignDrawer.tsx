import { useMemo } from 'react';
import { EXPERT_MAX_CAPACITY } from '@campaigncell/shared-types';
import { X, Check, Zap } from 'lucide-react';
import { ExpertProfile } from '../../api/aiApi';
import { AuthUser } from '../../auth/authStore';
import { OptimizationCase } from '../../types';
import { EXPERT_SPECIALTY_LABELS, PRIORITY_LABELS, SEGMENT_LABELS } from '../../shared/labels';

interface Candidate {
  id: string;
  name: string;
  specialties: string[];
  activeCaseCount: number;
  performanceScore: number;
  specialtyMatch: boolean;
  gapRatio: number;
  atCapacity: boolean;
  /** Case doc 5.3 formülü: uzmanlik_eslesme*0.5 + bosluk_orani*0.3 + performans*0.2 */
  suggestScore: number;
}

interface AssignDrawerProps {
  activeCase: OptimizationCase;
  staff: AuthUser[];
  profiles: ExpertProfile[];
  busyExpertId: string | null;
  onAssign: (expertId: string) => void;
  onClose: () => void;
}

export function AssignDrawer({ activeCase, staff, profiles, busyExpertId, onAssign, onClose }: AssignDrawerProps) {
  const candidates = useMemo<Candidate[]>(() => {
    const profileById = new Map(profiles.map((p) => [p.userId, p]));
    return staff
      .map((s) => {
        const p = profileById.get(s.id);
        const activeCaseCount = p?.activeCaseCount ?? 0;
        const performanceScore = p?.performanceScore ?? 0.5;
        const specialties = p?.specialties?.length ? p.specialties : s.specialties;
        const specialtyMatch = specialties.includes(activeCase.segment);
        const gapRatio = Math.max(0, 1 - activeCaseCount / EXPERT_MAX_CAPACITY);
        const suggestScore =
          (specialtyMatch ? 1 : 0) * 0.5 + gapRatio * 0.3 + performanceScore * 0.2;
        return {
          id: s.id,
          name: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || s.email || s.id.slice(0, 8),
          specialties,
          activeCaseCount,
          performanceScore,
          specialtyMatch,
          gapRatio,
          atCapacity: activeCaseCount >= EXPERT_MAX_CAPACITY,
          suggestScore: Math.round(suggestScore * 1000) / 1000,
        };
      })
      .sort((a, b) => Number(b.atCapacity === false) - Number(a.atCapacity === false) || b.suggestScore - a.suggestScore);
  }, [staff, profiles, activeCase.segment]);

  const best = candidates.find((c) => !c.atCapacity);

  return (
    <div className="drawer-overlay" role="dialog" aria-modal="true" aria-label="Uzman atama" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div className="drawer-title">Manuel Uzman Ataması</div>
            <div className="drawer-sub">
              {activeCase.campaign?.title ?? activeCase.campaignId}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-case-meta">
          <span className={`segment-dot segment-${activeCase.segment}`} />
          <span>{SEGMENT_LABELS[activeCase.segment]}</span>
          <span className="dot-sep">·</span>
          <span className="badge-pill pill-info">{PRIORITY_LABELS[activeCase.priority]}</span>
        </div>

        <p className="drawer-formula">
          Öneri skoru = uzmanlık eşleşme×0.5 + boşluk oranı×0.3 + performans×0.2 <em>(case 5.3)</em>
        </p>

        <div className="candidate-list">
          {candidates.map((c) => (
            <div key={c.id} className={`candidate-row ${c.atCapacity ? 'disabled' : ''}`}>
              <div className="candidate-main">
                <div className="candidate-name">
                  {c.name}
                  {best && c.id === best.id && (
                    <span className="badge-pill pill-success candidate-best">
                      <Zap size={11} /> AI önerisi
                    </span>
                  )}
                  {c.specialtyMatch && <span className="badge-pill pill-info">uzmanlık ✓</span>}
                </div>
                <div className="candidate-specialties">
                  {c.specialties.map((sp) => EXPERT_SPECIALTY_LABELS[sp] ?? sp).join(', ') || '—'}
                </div>
                <div className="candidate-metrics">
                  <div className="candidate-metric">
                    <span className="cm-label">Kapasite</span>
                    <div className="capacity-bar">
                      <div
                        className="capacity-bar-fill"
                        style={{
                          width: `${(c.activeCaseCount / EXPERT_MAX_CAPACITY) * 100}%`,
                          background: c.atCapacity ? 'var(--color-danger)' : 'var(--color-brand-blue-500)',
                        }}
                      />
                    </div>
                    <span className="cm-value">
                      {c.activeCaseCount}/{EXPERT_MAX_CAPACITY}
                    </span>
                  </div>
                  <div className="candidate-metric">
                    <span className="cm-label">Performans</span>
                    <span className="cm-value">%{Math.round(c.performanceScore * 100)}</span>
                  </div>
                  <div className="candidate-metric">
                    <span className="cm-label">Öneri</span>
                    <span className="cm-value cm-score">{c.suggestScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary candidate-assign"
                disabled={c.atCapacity || busyExpertId !== null}
                onClick={() => onAssign(c.id)}
              >
                {c.atCapacity ? 'Dolu' : busyExpertId === c.id ? 'Atanıyor…' : (
                  <>
                    <Check size={14} /> Ata
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
