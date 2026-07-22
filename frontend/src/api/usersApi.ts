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
