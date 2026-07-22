import axios, { AxiosInstance } from 'axios';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000/api/v1';

/** Envelope the gateway/services return: { success, data, error }. */
export interface Envelope<T> {
  success: boolean;
  data: T;
  error: { message: string; statusCode: number } | null;
}

/** An axios client that never throws on non-2xx, so tests can assert on status codes. */
export function client(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// Memoize staff tokens for the whole run so we don't burn the auth rate limit
// re-logging-in the same account across many tests.
const staffTokenCache = new Map<string, string>();

export async function staffLogin(email: string, password = 'Password1!'): Promise<string> {
  const cached = staffTokenCache.get(email);
  if (cached) return cached;
  const res = await client().post('/auth/staff/login', { email, password });
  if (!res.data?.data?.accessToken) {
    throw new Error(`staffLogin(${email}) failed: ${JSON.stringify(res.data)}`);
  }
  const token = res.data.data.accessToken as string;
  staffTokenCache.set(email, token);
  return token;
}

export async function subscriberLogin(gsm: string): Promise<string> {
  await client().post('/auth/subscriber/otp/request', { gsm, intent: 'login' });
  const res = await client().post('/auth/subscriber/otp/verify', { gsm, code: '1234', intent: 'login' });
  if (!res.data?.data?.accessToken) {
    throw new Error(`subscriberLogin(${gsm}) failed: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.accessToken as string;
}

/** Waits until the gateway answers, so the suite tolerates a still-booting stack. */
export async function waitForGateway(timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await axios.get(`${BASE_URL.replace(/\/api\/v1$/, '')}/health`, { validateStatus: () => true });
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Gateway did not become ready in time');
}
