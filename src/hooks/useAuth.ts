"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearSession,
  getSession,
  mergeSessionClinicName,
  setSession,
  type AuthSession,
} from "@/lib/authSession";
import { loginRequest, logoutRequest } from "@/lib/authApi";
import { fetchPortalClinic } from "@/lib/portalApi";
import { ApiError } from "@/lib/api";
import type { PortalUser } from "@/lib/types";

const STAFF_ROLES = new Set(["clinic_admin", "clinic_operator"]);

function initialsFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 2) return digits.slice(-2);
  return "??";
}

function sessionToPortalUser(session: AuthSession): PortalUser {
  return {
    ...session.user,
    clinicName: session.clinicName || "Clinic",
    avatarInitials: initialsFromPhone(session.user.phone),
  };
}

export function useAuth() {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const stored = getSession();
    if (!stored) {
      setSessionState(null);
      setLoading(false);
      return;
    }
    try {
      const clinic = await fetchPortalClinic();
      mergeSessionClinicName(clinic.name);
      const next = getSession();
      setSessionState(next);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        clearSession();
        setSessionState(null);
      } else {
        setSessionState(stored);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void hydrate();
    });
  }, [hydrate]);

  const user = useMemo(
    () => (session ? sessionToPortalUser(session) : null),
    [session],
  );

  async function login(phone: string, password: string): Promise<void> {
    const trimmed = phone.trim();
    const data = await loginRequest(trimmed, password);
    if (!STAFF_ROLES.has(data.user.role)) {
      throw new ApiError(
        "This portal is only for clinic administrators and operators.",
        403,
      );
    }
    if (!data.user.clinicId) {
      throw new ApiError("Your account is not assigned to a clinic yet.", 403);
    }
    const next: AuthSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
    setSession(next);
    setSessionState(next);
    try {
      const clinic = await fetchPortalClinic();
      mergeSessionClinicName(clinic.name);
      setSessionState(getSession());
    } catch {
      mergeSessionClinicName("Clinic");
      setSessionState(getSession());
    }
  }

  async function logout() {
    try {
      await logoutRequest();
    } catch {
      /* still clear locally */
    } finally {
      clearSession();
      setSessionState(null);
    }
  }

  return { user, loading, login, logout, refreshSession: hydrate };
}
