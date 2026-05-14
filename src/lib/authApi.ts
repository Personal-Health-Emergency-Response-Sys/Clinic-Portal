import { apiJson, ApiError } from "./api";
import type { SessionUser } from "./authSession";
import { DEMO_PORTAL_PHONE } from "./demo-credentials";
import { demoCredentialsMatch, isDemoMode } from "./demo-mode";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function loginRequest(phone: string, password: string) {
  if (isDemoMode()) {
    await sleep(120);
    if (!demoCredentialsMatch(phone, password)) {
      throw new ApiError("Invalid phone or password.", 401);
    }
    const user: SessionUser = {
      id: "user-demo-admin",
      phone: DEMO_PORTAL_PHONE,
      role: "clinic_admin",
      status: "active",
      clinicId: "clinic-demo-1",
    };
    return {
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      user,
    };
  }
  return apiJson<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
    auth: false,
  });
}

export async function logoutRequest() {
  if (isDemoMode()) {
    await sleep(80);
    return { loggedOut: true };
  }
  return apiJson<{ loggedOut: boolean }>("/api/v1/auth/logout", {
    method: "POST",
  });
}
