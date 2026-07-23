import axios from 'axios';
import { API_BASE_URL } from '../api/client';

/**
 * Sunum/senaryo/güvenlik modlarının kullandığı ham istemci. Oturumdan bağımsız,
 * çağrı başına açık token alır (senaryo birden fazla rol arasında geçtiği için
 * paylaşılan apiClient'ın enjekte ettiği token kullanılamaz). validateStatus
 * hiç throw etmez; her durum kodu döner (güvenlik testleri kodları assert eder).
 */
const raw = axios.create({ baseURL: API_BASE_URL, validateStatus: () => true });

export function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function staffLoginRaw(email: string, password = 'Password1!') {
  const res = await raw.post('/auth/staff/login', { email, password });
  return res.data?.data as { accessToken: string; refreshToken: string; user: { id: string; role: string } } | undefined;
}

export async function subscriberLoginRaw(gsm: string) {
  await raw.post('/auth/subscriber/otp/request', { gsm, intent: 'login' });
  const res = await raw.post('/auth/subscriber/otp/verify', { gsm, code: '1234', intent: 'login' });
  return res.data?.data as { accessToken: string; refreshToken: string; user: { id: string; role: string } } | undefined;
}

export async function createCampaignRaw(token: string, body: Record<string, unknown>) {
  const res = await raw.post('/campaigns', body, { headers: authHeader(token) });
  return res.data?.data;
}

export async function getJson(path: string, token?: string) {
  const res = await raw.get(path, { headers: authHeader(token) });
  return res.data?.data;
}

export async function caseAction(token: string, id: string, action: string, body?: Record<string, unknown>) {
  const res = await raw.patch(`/cases/${id}/${action}`, body ?? {}, { headers: authHeader(token) });
  return { status: res.status, data: res.data?.data, error: res.data?.error };
}

/** Güvenlik testleri için: durum kodunu (ve varsa mesajı) döndüren jenerik istek. */
export async function probe(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  opts: { token?: string; body?: unknown; rawToken?: string } = {},
): Promise<{ status: number; message?: string }> {
  const headers = opts.rawToken !== undefined ? { Authorization: `Bearer ${opts.rawToken}` } : authHeader(opts.token);
  const res = await raw.request({ method, url: path, data: opts.body, headers });
  return { status: res.status, message: res.data?.error?.message };
}

export const DEMO = {
  UZMAN: 'uzman1@campaigncell.com',
  SUPERVISOR: 'supervisor@campaigncell.com',
  ADMIN: 'admin@campaigncell.com',
  SUBSCRIBER_GSM: '5551234567',
  PASSWORD: 'Password1!',
};
