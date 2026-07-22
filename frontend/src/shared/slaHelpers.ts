export function slaPillClass(priority: string, slaBreached: boolean): string {
  if (slaBreached || priority === 'KRITIK') return 'pill-danger';
  if (priority === 'YUKSEK') return 'pill-warning';
  return 'pill-info';
}

export function formatRemaining(slaDueAt: string, completedAt?: string | null): string {
  if (completedAt) return 'Tamamlandı';
  const diffMs = new Date(slaDueAt).getTime() - Date.now();
  if (diffMs <= 0) return 'SLA süresi doldu';
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hours}s ${mins}dk kaldı`;
}
