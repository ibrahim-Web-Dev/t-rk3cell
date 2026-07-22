import { Role } from '@campaigncell/shared-types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  gsm?: string | null;
  specialties: string[];
  regions: string[];
}

const ACCESS_KEY = 'campaigncell.accessToken';
const REFRESH_KEY = 'campaigncell.refreshToken';
const USER_KEY = 'campaigncell.user';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function setSession(tokens: AuthTokens, user: AuthUser): void {
  setTokens(tokens);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
