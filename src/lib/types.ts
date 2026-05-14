// src/lib/types.ts

import type { SessionUser } from "./authSession";

export interface PortalUser extends SessionUser {
  clinicName: string;
  avatarInitials: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
}

export type ToastType = "success" | "error" | "warning";

/** Local row id for drag-and-drop; synced to API as phones[].priority order */
export interface EmergencyContact {
  id: string;
  number: string;
  label: string;
  priority: number;
}

export interface StatCardData {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: string;
}
