// src/lib/adminApi.ts
//
// Thin wrappers over /api/v1/admin/* endpoints.
// Endpoints, payloads and response shapes follow the SmartHERS — System Admin
// Postman collection (sections 01-08).

import { apiJson } from "./api";
import { isDemoMode } from "./demo-mode";
import {
  demoApplyImport,
  demoCancelImport,
  demoFetchAdminClinic,
  demoFetchAdminUser,
  demoFetchHisKey,
  demoFetchImportJob,
  demoGenerateHisKey,
  demoGetConfig,
  demoListAdminClinics,
  demoListAdminUsers,
  demoListClaims,
  demoListLogs,
  demoPatchAdminClinic,
  demoPatchAdminUser,
  demoResetUserPassword,
  demoRevokeHisKey,
  demoStartImport,
  demoStats,
  demoUnlockUser,
  demoUpdateConfig,
  demoUpdateImportResolutions,
  demoApproveClaim,
  demoRejectClaim,
} from "./demo-state";

// ──────────────────────────────────────────────────────────────────────────
// 01. Dashboard — Stats
// GET /api/v1/admin/stats
// ──────────────────────────────────────────────────────────────────────────

export interface AdminStats {
  clinics: {
    total: number;
    active: number;
    deactivated: number;
    verified: number;
    unverified: number;
    withAmbulance: number;
  };
  users: {
    byRole: {
      general_user: number;
      driver: number;
      clinic_admin: number;
      clinic_operator: number;
      system_admin: number;
    };
    byStatus: {
      pending_verification: number;
      active: number;
      deactivated: number;
    };
  };
  claims: { pending: number; approved: number; rejected: number };
  sessions: {
    Created: number;
    Accepted: number;
    EnRoute: number;
    Arrived: number;
    PickedUp: number;
    Completed: number;
    CancelledOrTimeout: number;
  };
  sos: {
    byQueueStatus: {
      pending_dispatch: number;
      dispatched: number;
      session_created: number;
      dismissed: number;
    };
    last24h: number;
  };
  his: { activeKeys: number };
  mohImports: {
    pending_review: number;
    applying: number;
    applied: number;
    cancelled: number;
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  if (isDemoMode()) return demoStats();
  return apiJson<AdminStats>("/api/v1/admin/stats");
}

// ──────────────────────────────────────────────────────────────────────────
// 02. Clinic Claims
// GET  /api/v1/admin/claims
// POST /api/v1/admin/claims/:claimId/approve
// POST /api/v1/admin/claims/:claimId/reject
// ──────────────────────────────────────────────────────────────────────────

export interface AdminClaimClinic {
  id: string;
  name: string;
  type: "clinic" | "hospital" | string;
  address?: string | null;
  specialty?: string | null;
  subSpecialty?: string | null;
  verified: boolean;
}

export interface AdminClaim {
  id: string;
  clinic: AdminClaimClinic;
  submitterPhone: string;
  submitterFullName: string;
  status: "pending" | "approved" | "rejected";
  businessLicenseUrl?: string | null;
  medicalCertUrl?: string | null;
  rejectionReason?: string | null;
  createdUserId?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface ClaimListResult {
  data: AdminClaim[];
  nextCursor: string | null;
}

export interface ClaimActionResult {
  claimId: string;
  clinicId?: string;
  status: "approved" | "rejected";
  createdUserId?: string | null;
  rejectionReason?: string | null;
}

export async function listClaims(params?: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  cursor?: string;
}): Promise<ClaimListResult> {
  if (isDemoMode()) return demoListClaims(params ?? {});
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit)  q.set("limit",  String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  const result = await apiJson<ClaimListResult>(`/api/v1/admin/claims?${q}`);
  return {
    data: result?.data ?? [],
    nextCursor: result?.nextCursor ?? null,
  };
}

export async function approveClaim(claimId: string): Promise<ClaimActionResult> {
  if (isDemoMode()) return demoApproveClaim(claimId);
  return apiJson<ClaimActionResult>(
    `/api/v1/admin/claims/${claimId}/approve`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function rejectClaim(
  claimId: string,
  reason: string,
): Promise<ClaimActionResult> {
  if (isDemoMode()) return demoRejectClaim(claimId, reason);
  return apiJson<ClaimActionResult>(
    `/api/v1/admin/claims/${claimId}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 03. MoH Import
// POST   /api/v1/admin/moh-import
// GET    /api/v1/admin/moh-import/:jobId
// PUT    /api/v1/admin/moh-import/:jobId/resolutions
// POST   /api/v1/admin/moh-import/:jobId/apply
// DELETE /api/v1/admin/moh-import/:jobId
// ──────────────────────────────────────────────────────────────────────────

export type ImportResolution = "use_moh" | "keep_current" | "skip" | "pending";

export interface MohRecord {
  mohRegistryId: string;
  name: string;
  type: string;
  address?: string;
  specialty?: string;
  phones?: { number: string; priority: number; label?: string }[];
  location?: { type: "Point"; coordinates: [number, number] };
}

export interface ImportDiffRecord {
  mohRegistryId: string;
  action: "new" | "conflict" | "unchanged";
  resolution: ImportResolution;
  incoming: Partial<MohRecord>;
  existing?: Partial<MohRecord> | null;
  conflictingFields?: string[] | null;
}

export interface ImportJob {
  jobId: string;
  sourceTag: string;
  status: "pending_review" | "applying" | "applied" | "cancelled";
  diffRecords: ImportDiffRecord[];
  counts: { new: number; conflict: number; unchanged: number };
  createdAt: string;
}

export interface ApplyResult {
  created: number;
  updated: number;
  skipped: number;
  jobStatus: "applied";
}

export async function startMohImport(body: {
  sourceTag: string;
  sourceType: "json";
  records: MohRecord[];
}): Promise<{ jobId: string }> {
  if (isDemoMode()) return demoStartImport(body);
  return apiJson<{ jobId: string }>("/api/v1/admin/moh-import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getImportJob(jobId: string): Promise<ImportJob> {
  if (isDemoMode()) return demoFetchImportJob(jobId);
  return apiJson<ImportJob>(`/api/v1/admin/moh-import/${jobId}`);
}

export async function updateImportResolutions(
  jobId: string,
  resolutions: { mohRegistryId: string; resolution: ImportResolution }[],
): Promise<ImportJob> {
  if (isDemoMode()) return demoUpdateImportResolutions(jobId, resolutions);
  return apiJson<ImportJob>(
    `/api/v1/admin/moh-import/${jobId}/resolutions`,
    { method: "PUT", body: JSON.stringify({ resolutions }) },
  );
}

export async function applyImport(jobId: string): Promise<ApplyResult> {
  if (isDemoMode()) return demoApplyImport(jobId);
  return apiJson<ApplyResult>(`/api/v1/admin/moh-import/${jobId}/apply`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function cancelImport(jobId: string): Promise<{ jobStatus: "cancelled" }> {
  if (isDemoMode()) return demoCancelImport(jobId);
  return apiJson<{ jobStatus: "cancelled" }>(
    `/api/v1/admin/moh-import/${jobId}`,
    { method: "DELETE" },
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 04. Clinics — Moderation
// GET   /api/v1/admin/clinics
// GET   /api/v1/admin/clinics/:clinicId
// PATCH /api/v1/admin/clinics/:clinicId
// ──────────────────────────────────────────────────────────────────────────

export interface AdminClinic {
  id: string;
  name: string;
  type: "clinic" | "hospital" | string;
  address?: string | null;
  specialty: string;
  subSpecialty?: string | null;
  status: "active" | "deactivated" | string;
  verified: boolean;
  operationalStatus?: string | null;
  effectiveStatus?: string | null;
  ambulanceAvailable?: boolean;
  ambulanceCountAvailable?: number | null;
  ambulanceExpiry?: string | null;
  ambulanceIsActive?: boolean;
  phones?: { number: string; priority: number; label?: string | null }[];
  location?: { type?: string; coordinates?: [number, number] } | null;
  mohRegistryId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminClinicListResult {
  data: AdminClinic[];
  nextCursor: string | null;
}

export async function listAdminClinics(params?: {
  status?: "active" | "deactivated";
  verified?: boolean;
  q?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminClinicListResult> {
  if (isDemoMode()) return demoListAdminClinics(params ?? {});
  const qs = new URLSearchParams();
  if (params?.status)               qs.set("status",   params.status);
  if (typeof params?.verified === "boolean") qs.set("verified", String(params.verified));
  if (params?.q)                    qs.set("q",        params.q);
  if (params?.limit)                qs.set("limit",    String(params.limit));
  if (params?.cursor)               qs.set("cursor",   params.cursor);
  const result = await apiJson<AdminClinicListResult>(
    `/api/v1/admin/clinics?${qs}`,
  );
  return {
    data: result?.data ?? [],
    nextCursor: result?.nextCursor ?? null,
  };
}

export async function getAdminClinic(clinicId: string): Promise<AdminClinic> {
  if (isDemoMode()) return demoFetchAdminClinic(clinicId);
  return apiJson<AdminClinic>(`/api/v1/admin/clinics/${clinicId}`);
}

export interface AdminClinicPatch {
  status?: "active" | "deactivated";
  verified?: boolean;
  specialty?: string;
  name?: string;
  address?: string;
  phones?: { number: string; priority: number; label?: string }[];
  location?: { type: "Point"; coordinates: [number, number] };
  ambulanceAvailable?: boolean;
  ambulanceCountAvailable?: number;
}

export async function patchClinic(
  clinicId: string,
  patch: AdminClinicPatch,
): Promise<AdminClinic> {
  if (isDemoMode()) return demoPatchAdminClinic(clinicId, patch);
  return apiJson<AdminClinic>(`/api/v1/admin/clinics/${clinicId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 05. Users — Moderation
// GET   /api/v1/admin/users
// GET   /api/v1/admin/users/:userId
// PATCH /api/v1/admin/users/:userId
// POST  /api/v1/admin/users/:userId/reset-password
// POST  /api/v1/admin/users/:userId/unlock
// ──────────────────────────────────────────────────────────────────────────

export type AdminUserRole =
  | "general_user"
  | "driver"
  | "clinic_admin"
  | "clinic_operator"
  | "system_admin";

export type AdminUserStatus = "pending_verification" | "active" | "deactivated";

export interface AdminUser {
  id: string;
  phone: string;
  role: AdminUserRole | string;
  status: AdminUserStatus | string;
  name?: string | null;
  firstName?: string | null;
  clinicRef?: {
    clinicId?: string | null;
    invitedByAdminId?: string | null;
  } | null;
  /** Convenience alias the API also returns in some shapes. */
  clinicId?: string | null;
  lastLogin?: string | null;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  driverProfile?: { onDuty?: boolean; firstName?: string | null } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminUserListResult {
  data: AdminUser[];
  nextCursor: string | null;
}

export async function listAdminUsers(params?: {
  role?: AdminUserRole;
  status?: AdminUserStatus;
  phone?: string;
  clinicId?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminUserListResult> {
  if (isDemoMode()) return demoListAdminUsers(params ?? {});
  const qs = new URLSearchParams();
  if (params?.role)     qs.set("role",     params.role);
  if (params?.status)   qs.set("status",   params.status);
  if (params?.phone)    qs.set("phone",    params.phone);
  if (params?.clinicId) qs.set("clinicId", params.clinicId);
  if (params?.limit)    qs.set("limit",    String(params.limit));
  if (params?.cursor)   qs.set("cursor",   params.cursor);
  const result = await apiJson<AdminUserListResult>(
    `/api/v1/admin/users?${qs}`,
  );
  return {
    data: result?.data ?? [],
    nextCursor: result?.nextCursor ?? null,
  };
}

export async function getAdminUser(userId: string): Promise<AdminUser> {
  if (isDemoMode()) return demoFetchAdminUser(userId);
  return apiJson<AdminUser>(`/api/v1/admin/users/${userId}`);
}

export interface AdminUserPatch {
  status?: AdminUserStatus;
  role?: AdminUserRole;
}

export async function patchUser(
  userId: string,
  patch: AdminUserPatch,
): Promise<AdminUser> {
  if (isDemoMode()) return demoPatchAdminUser(userId, patch);
  return apiJson<AdminUser>(`/api/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export interface ResetPasswordResult {
  userId: string;
  /** Plaintext temp password — only present outside production. */
  devPassword?: string;
}

export async function resetUserPassword(
  userId: string,
): Promise<ResetPasswordResult> {
  if (isDemoMode()) return demoResetUserPassword(userId);
  return apiJson<ResetPasswordResult>(
    `/api/v1/admin/users/${userId}/reset-password`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export interface UnlockUserResult {
  userId: string;
  wasLocked: boolean;
}

export async function unlockUser(userId: string): Promise<UnlockUserResult> {
  if (isDemoMode()) return demoUnlockUser(userId);
  return apiJson<UnlockUserResult>(
    `/api/v1/admin/users/${userId}/unlock`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 06. HIS API Keys — Lifecycle
// GET    /api/v1/admin/his-keys/:clinicId
// POST   /api/v1/admin/his-keys/:clinicId
// DELETE /api/v1/admin/his-keys/:clinicId
// ──────────────────────────────────────────────────────────────────────────

export interface HisKeyMeta {
  clinicId: string;
  maskedKey: string | null;
  status: "active" | "revoked" | null;
  createdAt?: string | null;
  revokedAt?: string | null;
}

export interface HisKeyGenResult {
  clinicId: string;
  /** Plaintext sk_his_… — shown to admin once, never retrievable again. */
  rawKey: string;
  maskedKey: string;
  status: "active";
  createdAt: string;
}

export async function getHisKeyMeta(clinicId: string): Promise<HisKeyMeta> {
  if (isDemoMode()) return demoFetchHisKey(clinicId);
  return apiJson<HisKeyMeta>(`/api/v1/admin/his-keys/${clinicId}`);
}

export async function generateHisKey(clinicId: string): Promise<HisKeyGenResult> {
  if (isDemoMode()) return demoGenerateHisKey(clinicId);
  return apiJson<HisKeyGenResult>(`/api/v1/admin/his-keys/${clinicId}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function revokeHisKey(clinicId: string): Promise<{ status: "revoked" }> {
  if (isDemoMode()) return demoRevokeHisKey(clinicId);
  return apiJson<{ status: "revoked" }>(
    `/api/v1/admin/his-keys/${clinicId}`,
    { method: "DELETE" },
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 07. System Config — Tunables
// GET /api/v1/admin/config
// PUT /api/v1/admin/config
// ──────────────────────────────────────────────────────────────────────────

export interface OptimalityWeights {
  statusWeight: number;
  distanceWeight: number;
  etaWeight: number;
  specialtyWeight: number;
  historyWeight: number;
}

export interface SystemConfig {
  searchRadiusKm: number;
  geminiDailyBudgetUSD: number;
  perUserDailySessionLimit: number;
  maxSosAttemptsPerUserPerHr: number;
  maxLoginAttemptsPerWindow: number;
  loginWindowMin: number;
  ambulanceExpiryHours: number;
  statusExpiryHours: number;
  assignmentExpiryMin: number;
  sessionTimeoutMin: number;
  gpsIntervalSec: number;
  aiReRankEnabled: boolean;
  optimalityWeights: OptimalityWeights;
  fallbackEmergencyNumber: string;
  // The backend may add more fields over time — keep this open for forward-compat.
  [key: string]: unknown;
}

export async function getConfig(): Promise<SystemConfig> {
  if (isDemoMode()) return demoGetConfig();
  return apiJson<SystemConfig>("/api/v1/admin/config");
}

export async function updateConfig(
  patch: Partial<SystemConfig>,
): Promise<SystemConfig> {
  if (isDemoMode()) return demoUpdateConfig(patch);
  return apiJson<SystemConfig>("/api/v1/admin/config", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 08. Audit Logs
// GET /api/v1/admin/logs
// ──────────────────────────────────────────────────────────────────────────

export type AdminLogTargetType =
  | "user"
  | "clinic"
  | "session"
  | "sos_attempt"
  | "assignment"
  | "system_config"
  | "invitation"
  | "his_key"
  | "moh_import_job";

export interface AdminLog {
  id: string;
  type: string;
  actorId?: string | null;
  targetType?: AdminLogTargetType | string | null;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminLogListResult {
  data: AdminLog[];
  nextCursor: string | null;
}

export async function listLogs(params?: {
  type?: string;
  actorId?: string;
  targetType?: AdminLogTargetType;
  targetId?: string;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminLogListResult> {
  if (isDemoMode()) return demoListLogs(params ?? {});
  const qs = new URLSearchParams();
  if (params?.type)       qs.set("type",       params.type);
  if (params?.actorId)    qs.set("actorId",    params.actorId);
  if (params?.targetType) qs.set("targetType", params.targetType);
  if (params?.targetId)   qs.set("targetId",   params.targetId);
  if (params?.since)      qs.set("since",      params.since);
  if (params?.until)      qs.set("until",      params.until);
  if (params?.limit)      qs.set("limit",      String(params.limit));
  if (params?.cursor)     qs.set("cursor",     params.cursor);
  const result = await apiJson<AdminLogListResult>(
    `/api/v1/admin/logs?${qs}`,
  );
  return {
    data: result?.data ?? [],
    nextCursor: result?.nextCursor ?? null,
  };
}
