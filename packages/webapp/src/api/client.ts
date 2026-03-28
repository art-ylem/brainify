import { getInitData } from '../lib/telegram.js';
import { isTelegramMiniApp } from '../lib/telegram.js';
import { getWebToken, setWebToken } from '../lib/auth.js';

const API_BASE = '';

function getAuthHeader(): string | null {
  // Strategy 1: Telegram Mini App
  if (isTelegramMiniApp()) {
    const initData = getInitData();
    if (initData) return `tma ${initData}`;
  }
  // Strategy 2: Web JWT
  const webToken = getWebToken();
  if (webToken) return `Bearer ${webToken}`;
  // No auth (guest)
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });
  } catch (err) {
    console.error('[API] Network error:', path, err);
    throw new ApiError(0, 'Network error');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('[API] Error:', res.status, path, body);
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- User ---

export interface UserProfile {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
}

export function getMe() {
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  const headers: Record<string, string> = {};
  if (startParam) {
    headers['X-Referrer'] = startParam;
  }
  return request<UserProfile>('/api/user/me', { headers });
}

// --- Tasks ---

export interface TaskInfo {
  id: number;
  type: string;
  category: string;
  name: string;
  descriptionKey: string;
}

export function getTasks(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<TaskInfo[]>(`/api/tasks${qs}`);
}

export function getTask(id: number) {
  return request<TaskInfo>(`/api/tasks/${id}`);
}

// --- Sessions ---

export interface TaskSession {
  sessionId: number | string;
  type: string;
  category: string;
  difficulty: number;
  data: Record<string, unknown>;
  timeLimitMs: number | null;
}

export function startTaskSession(taskId: number, difficulty = 1) {
  return request<TaskSession>(`/api/tasks/${taskId}/start`, {
    method: 'POST',
    body: JSON.stringify({ difficulty }),
  });
}

// --- Attempts ---

export interface AttemptResult {
  id: number;
  taskId: number;
  score: number;
  timeMs: number;
  difficulty: number;
  isCorrect: boolean;
  details: Record<string, unknown> | null;
  completedAt: string;
}

export function submitAttempt(sessionId: number | string, answer: unknown, timeMs: number) {
  return request<AttemptResult>('/api/attempts', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answer, timeMs }),
  });
}

// --- Progress ---

export interface ProgressData {
  daily: Array<{ date: string; totalScore: number; count: number }>;
  byCategory: Array<{ category: string; totalScore: number; count: number; avgTimeMs: number }>;
  streak: { current: number; longest: number; lastActivityDate: string | null };
}

export function getProgress() {
  return request<ProgressData>('/api/progress');
}

// --- Leaderboard ---

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string | null;
  firstName: string;
  totalScore: number;
  taskCount: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  type: string;
  period: string;
  page: number;
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

export function getLeaderboard(type: 'global' | 'friends' = 'global', period: 'week' | 'month' | 'all' = 'week', page = 1) {
  return request<LeaderboardResponse>(`/api/leaderboard?type=${type}&period=${period}&page=${page}`);
}

// --- Friends ---

export interface Friend {
  userId: number;
  username: string | null;
  firstName: string;
  since: string;
}

export function getFriends() {
  return request<{ friends: Friend[] }>('/api/friends');
}

// --- Duels ---

export interface DuelInfo {
  id: number;
  status: string;
  role: 'challenger' | 'opponent';
  opponent: { userId: number; username: string | null; firstName: string };
  task: { id: number; type: string; name: string } | null;
  challengerScore: number | null;
  opponentScore: number | null;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface DuelCreateResponse {
  duelId: number;
  sessionId: number;
  task: { id: number; type: string; category: string; data: Record<string, unknown> };
  expiresAt: string;
}

export interface DuelAcceptResponse {
  duelId: number;
  sessionId: number;
  task: { id: number; type: string; category: string; data: Record<string, unknown> };
}

export interface DuelResultResponse {
  duelId: number;
  outcome?: 'won' | 'lost' | 'draw';
  score?: number;
  yourScore?: number;
  opponentScore?: number;
  isCorrect: boolean;
  details: Record<string, unknown> | null;
}

export function getDuels() {
  return request<{ duels: DuelInfo[] }>('/api/duels');
}

export function createDuel(taskId: number, opponentId: number) {
  return request<DuelCreateResponse>('/api/duels', {
    method: 'POST',
    body: JSON.stringify({ taskId, opponentId }),
  });
}

export function acceptDuel(duelId: number) {
  return request<DuelAcceptResponse>(`/api/duels/${duelId}/accept`, {
    method: 'POST',
  });
}

export function submitChallengerResult(duelId: number, sessionId: number | string, answer: unknown, timeMs: number) {
  return request<DuelResultResponse>(`/api/duels/${duelId}/challenger-result`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, answer, timeMs }),
  });
}

export function submitOpponentResult(duelId: number, sessionId: number | string, answer: unknown, timeMs: number) {
  return request<DuelResultResponse>(`/api/duels/${duelId}/opponent-result`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, answer, timeMs }),
  });
}

// --- Achievements ---

export interface Achievement {
  type: string;
  unlockedAt: string;
}

export function getAchievements() {
  return request<Achievement[]>('/api/achievements');
}

// --- Telegram Login (Web auth) ---

export interface TelegramLoginResponse {
  token: string;
  user: UserProfile;
}

export async function loginWithTelegram(data: Record<string, unknown>): Promise<TelegramLoginResponse> {
  const result = await request<TelegramLoginResponse>('/api/auth/telegram', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setWebToken(result.token);
  return result;
}
