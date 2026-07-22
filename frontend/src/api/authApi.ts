import axios from 'axios';
import { API_BASE_URL, apiClient, unwrap } from './client';
import { AuthTokens, AuthUser } from '../auth/authStore';

export function requestOtp(gsm: string) {
  return unwrap<{ message: string }>(axios.post(`${API_BASE_URL}/auth/subscriber/otp/request`, { gsm }));
}

export function verifyOtp(input: {
  gsm: string;
  code: string;
  intent: 'login' | 'register';
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  return unwrap<AuthTokens & { user: AuthUser }>(axios.post(`${API_BASE_URL}/auth/subscriber/otp/verify`, input));
}

export function staffLogin(input: { email: string; password: string }) {
  return unwrap<AuthTokens & { user: AuthUser }>(axios.post(`${API_BASE_URL}/auth/staff/login`, input));
}

export function logout(refreshToken: string) {
  return unwrap<void>(apiClient.post('/auth/logout', { refreshToken }));
}
