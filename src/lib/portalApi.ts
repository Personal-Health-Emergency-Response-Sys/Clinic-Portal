import { apiJson } from "./api";
import { isDemoMode } from "./demo-mode";
import {
  demoDeactivateDriver,
  demoDeactivateOperator,
  demoFetchClinic,
  demoFetchDrivers,
  demoFetchOperators,
  demoFetchSosQueue,
  demoInviteDriver,
  demoInviteOperator,
  demoUpdateAmbulance,
  demoUpdatePhones,
  demoUpdateProfile,
  demoUpdateStatus,
} from "./demo-state";

/** GET /api/v1/portal/clinic — decorated clinic from backend */
export interface PortalClinic {
  id: string;
  name: string;
  type: "clinic" | "hospital";
  address?: string | null;
  specialty: string;
  location?: { type?: string; coordinates?: [number, number] };
  phones: { number: string; priority: number; label?: string }[];
  operationalStatus: string;
  effectiveStatus: string;
  statusIsStale: boolean;
  statusSource?: string | null;
  statusExpiry?: string | null;
  ambulanceAvailable: boolean;
  ambulanceCountAvailable?: number;
  ambulanceExpiry?: string | null;
  ambulanceIsActive: boolean;
  verified: boolean;
  status: string;
}

export interface SosQueueItem {
  sosAttemptId: string;
  queueStatus: "pending_dispatch" | "dispatched" | string;
  triggeredAt: string;
  elapsedSeconds: number;
  patientPhone: string | null;
  userLocation: { lat: number | null; lng: number | null };
  urgencyLevel?: string | null;
  recommendedSpecialty?: string | null;
  selectionMethod?: string | null;
  assignment: {
    assignmentId: string;
    driverId: string;
    driverPhone: string | null;
    driverName: string | null;
    expiresAt: string;
    secondsLeft: number;
  } | null;
}

export interface PortalDriver {
  id: string;
  phone: string;
  firstName: string | null;
  onDuty: boolean;
  status: string;
  lastLogin: string | null;
  createdAt: string;
}

export interface PortalOperator {
  id: string;
  phone: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
}

export interface InviteResult {
  invitationId: string;
  type: string;
  inviteePhone: string;
  expiresAt: string;
  devToken?: string;
}

export async function fetchPortalClinic() {
  if (isDemoMode()) return demoFetchClinic();
  return apiJson<PortalClinic>("/api/v1/portal/clinic");
}

export async function updatePortalProfile(body: Record<string, unknown>) {
  if (isDemoMode()) return demoUpdateProfile(body);
  return apiJson<PortalClinic>("/api/v1/portal/clinic", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function updatePortalPhones(phones: PortalClinic["phones"]) {
  if (isDemoMode()) return demoUpdatePhones(phones);
  return apiJson<PortalClinic>("/api/v1/portal/clinic/phones", {
    method: "PUT",
    body: JSON.stringify({ phones }),
  });
}

export async function updatePortalStatus(status: string, note?: string) {
  if (isDemoMode()) return demoUpdateStatus(status, note);
  return apiJson<PortalClinic>("/api/v1/portal/clinic/status", {
    method: "PUT",
    body: JSON.stringify({ status, ...(note !== undefined ? { note } : {}) }),
  });
}

export async function updatePortalAmbulance(available: boolean, count?: number) {
  if (isDemoMode()) return demoUpdateAmbulance(available, count);
  return apiJson<PortalClinic>("/api/v1/portal/clinic/ambulance", {
    method: "PUT",
    body: JSON.stringify(
      count !== undefined ? { available, count } : { available },
    ),
  });
}

export async function fetchSosQueue(limit = 50) {
  if (isDemoMode()) return demoFetchSosQueue(limit);
  const q = new URLSearchParams({ limit: String(limit) });
  return apiJson<SosQueueItem[]>(`/api/v1/portal/sos-queue?${q}`);
}

export async function fetchDrivers() {
  if (isDemoMode()) return demoFetchDrivers();
  return apiJson<PortalDriver[]>("/api/v1/portal/drivers");
}

export async function fetchOperators() {
  if (isDemoMode()) return demoFetchOperators();
  return apiJson<PortalOperator[]>("/api/v1/portal/operators");
}

export async function inviteDriver(body: {
  phone: string;
  email?: string | null;
  firstName?: string;
}) {
  if (isDemoMode()) return demoInviteDriver(body);
  return apiJson<InviteResult>("/api/v1/portal/drivers/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function inviteOperator(body: {
  phone: string;
  email?: string | null;
  firstName?: string;
}) {
  if (isDemoMode()) return demoInviteOperator(body);
  return apiJson<InviteResult>("/api/v1/portal/operators/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deactivateDriver(id: string) {
  if (isDemoMode()) return demoDeactivateDriver(id);
  return apiJson<{ id: string; status: string }>(
    `/api/v1/portal/drivers/${id}`,
    { method: "DELETE" },
  );
}

export async function deactivateOperator(id: string) {
  if (isDemoMode()) return demoDeactivateOperator(id);
  return apiJson<{ id: string; status: string }>(
    `/api/v1/portal/operators/${id}`,
    { method: "DELETE" },
  );
}
