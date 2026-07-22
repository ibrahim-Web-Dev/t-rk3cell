import { apiClient, unwrap } from './client';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  points: number;
}

export interface Profile {
  userId: string;
  totalPoints: number;
  level: string;
  completedCaseCount: number;
  averagePoints: number;
  dailyRank: number | null;
  weeklyRank: number | null;
  badges: { badgeCode: string; earnedAt: string }[];
}

export function leaderboard(period: 'daily' | 'weekly') {
  return unwrap<LeaderboardEntry[]>(apiClient.get('/game/leaderboard', { params: { period } }));
}

export function myProfile() {
  return unwrap<Profile>(apiClient.get('/game/profile/me'));
}
