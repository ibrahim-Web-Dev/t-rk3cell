import { apiClient, unwrap } from './client';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userLabel: string | null;
  action: string;
  ip: string | null;
  result: string;
  resourceId: string | null;
  detail: string | null;
  createdAt: string;
}

export function listAuditLogs(limit = 200) {
  return unwrap<AuditLogEntry[]>(apiClient.get('/audit-logs', { params: { limit } }));
}
