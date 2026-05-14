"use client";

const SESSION_KEY = "smarthers_portal_session_v1";

export interface SessionUser {
  id: string;
  phone: string;
  role: string;
  status: string;
  clinicId: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  clinicName?: string;
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function mergeSessionTokens(accessToken: string, refreshToken: string) {
  const cur = getSession();
  if (!cur) return;
  setSession({ ...cur, accessToken, refreshToken });
}

export function mergeSessionClinicName(clinicName: string) {
  const cur = getSession();
  if (!cur) return;
  setSession({ ...cur, clinicName });
}
