import { Role } from '@campaigncell/shared-types';
import { apiClient, unwrap } from './client';
import { AuthUser } from '../auth/authStore';

export function getMe() {
  return unwrap<AuthUser>(apiClient.get('/users/me'));
}

export interface CreateStaffInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  specialties: string[];
  regions: string[];
}

export function createStaff(input: CreateStaffInput) {
  return unwrap<AuthUser>(apiClient.post('/users/staff', input));
}

export function listStaff() {
  return unwrap<AuthUser[]>(apiClient.get('/users/staff'));
}

/** Personel rolünü değiştirir (ADMIN). Audit'e "role-changed" olarak yazılır. */
export function updateStaffRole(userId: string, role: Role) {
  return unwrap<AuthUser>(apiClient.patch(`/users/${userId}/role`, { role }));
}

export interface StaffDirectoryEntry {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

/** Herkese (PERSONEL dahil) açık, yalnızca isim içeren düşük-yetkili personel dizini - liderlik tablosu gibi ekranlarda UUID yerine isim göstermek için. */
export function listStaffDirectory() {
  return unwrap<StaffDirectoryEntry[]>(apiClient.get('/users/staff-directory'));
}
