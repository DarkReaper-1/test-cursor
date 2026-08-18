import { loadToken } from "./session";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await loadToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = data as { error?: string; message?: string };
    throw new ApiError(response.status, body.error ?? "ERROR", body.message ?? "Request failed");
  }
  return data as T;
}

export type CharacterSnapshot = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  rankKey: string;
  momentum: number;
  title: string;
  scores: Record<string, number>;
};

export type Directive = {
  id: string;
  category: string;
  title: string;
  body: string;
  difficulty: number;
  status: string;
  payload: {
    exercises?: Array<{
      key: string;
      name: string;
      targetSets: number;
      targetReps: number;
      load: number;
    }>;
    minutes?: number;
  };
};

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; onboardingComplete: boolean }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; onboardingComplete: boolean }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () =>
    request<{ onboardingComplete: boolean; character: CharacterSnapshot | null }>("/api/v1/me"),
  onboard: (payload: unknown) =>
    request<{ ok: true }>("/api/v1/onboarding", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  today: () =>
    request<{ dateKey: string; character: CharacterSnapshot; directive: Directive }>("/api/v1/today"),
  complete: (payload: unknown) =>
    request<{
      granted: boolean;
      replay: boolean;
      xp: number;
      leveledUp?: boolean;
      character: CharacterSnapshot;
    }>("/api/v1/completions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
