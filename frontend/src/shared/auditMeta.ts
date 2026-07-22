/**
 * Audit log kayıtlarını türe göre kategorize eder + her kategoriye ayrı bir
 * renk (pill sınıfı) verir. Kategori = işlemin alanı (kimlik, vaka, rol...),
 * sonuç (SUCCESS/FAILURE) ayrı bir sütunda gösterilir.
 */
export type AuditCategory = 'auth' | 'case' | 'staff' | 'delete' | 'denied' | 'other';

export interface AuditCategoryMeta {
  key: AuditCategory;
  label: string;
  pill: string; // badge-pill yanına eklenen renk sınıfı
}

export const AUDIT_CATEGORY_META: Record<AuditCategory, AuditCategoryMeta> = {
  auth: { key: 'auth', label: 'Kimlik', pill: 'pill-info' },
  case: { key: 'case', label: 'Vaka', pill: 'pill-success' },
  staff: { key: 'staff', label: 'Personel / Rol', pill: 'pill-purple' },
  delete: { key: 'delete', label: 'Silme', pill: 'pill-danger' },
  denied: { key: 'denied', label: 'Erişim Reddi', pill: 'pill-warning' },
  other: { key: 'other', label: 'Diğer', pill: 'pill-muted' },
};

/** Sabit gösterim sırası (filtre çipleri için). */
export const AUDIT_CATEGORY_ORDER: AuditCategory[] = ['auth', 'case', 'staff', 'delete', 'denied', 'other'];

export function categorizeAudit(action: string, result: string): AuditCategory {
  const a = action.toLowerCase();
  // AllExceptionsFilter'ın ürettiği "servis:METHOD /path" biçimi = 401/403 gibi
  // reddedilen istekler.
  if (a.includes(':')) return 'denied';
  if (a === 'campaign-deleted') return 'delete';
  if (a === 'role-changed' || a === 'staff-created' || a === 'staff-updated') return 'staff';
  if (a.startsWith('case-')) return 'case';
  if (a.includes('login') || a.includes('logout') || a.includes('token-refresh') || a.includes('otp')) return 'auth';
  if (result === 'FAILURE') return 'denied';
  return 'other';
}

/** "İşlem" sütununda gösterilecek okunur etiket (ham "servis:METHOD /path" kısaltılır). */
export function auditActionLabel(action: string): string {
  if (action.includes(':')) {
    // "campaign-service:DELETE /api/v1/campaigns/xxx" -> "DELETE /api/v1/campaigns/xxx"
    const afterColon = action.split(':').slice(1).join(':').trim();
    return afterColon || action;
  }
  return action;
}
