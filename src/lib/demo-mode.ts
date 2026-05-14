import { DEMO_PORTAL_PASSWORD, DEMO_PORTAL_PHONE } from "./demo-credentials";

/** Demo UI + in-memory API unless explicitly disabled at build time. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

export function demoCredentialsMatch(phone: string, password: string): boolean {
  return phone.trim() === DEMO_PORTAL_PHONE && password === DEMO_PORTAL_PASSWORD;
}
