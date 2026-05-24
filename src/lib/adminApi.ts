import { apiJson } from "./api";

// ─── Clinic Claims ─────────────────────────────────────────────────────────
// GET  /api/v1/admin/claims
// POST /api/v1/admin/claims/:claimId/approve
// POST /api/v1/admin/claims/:claimId/reject

export interface AdminClaim {
  id: string;
  clinicId: string;
  submittedBy: string;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimListResult {
  data: AdminClaim[];
  cursor?: string | null;
}

export async function listClaims(params?: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  cursor?: string;
}): Promise<ClaimListResult> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit)  q.set("limit",  String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  return apiJson<ClaimListResult>(`/api/v1/admin/claims?${q}`);
}

export async function approveClaim(claimId: string): Promise<AdminClaim> {
  return apiJson<AdminClaim>(`/api/v1/admin/claims/${claimId}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectClaim(claimId: string, reason: string): Promise<AdminClaim> {
  return apiJson<AdminClaim>(`/api/v1/admin/claims/${claimId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ─── MoH Import ────────────────────────────────────────────────────────────
// POST   /api/v1/admin/moh-import
// GET    /api/v1/admin/moh-import/:jobId
// PUT    /api/v1/admin/moh-import/:jobId/resolutions
// POST   /api/v1/admin/moh-import/:jobId/apply
// DELETE /api/v1/admin/moh-import/:jobId

export type ImportResolution = "use_moh" | "keep_current" | "skip" | "pending";

export interface MohRecord {
  mohRegistryId: string;
  name: string;
  type: string;
  address?: string;
  specialty?: string;
  phones?: { number: string; priority: number }[];
  location?: { type: "Point"; coordinates: [number, number] };
}

export interface ImportDiffRecord {
  mohRegistryId: string;
  action: "new" | "conflict" | "unchanged";
  resolution: ImportResolution;
  incoming: Partial<MohRecord>;
  existing?: Partial<MohRecord> | null;
}

export interface ImportJob {
  jobId: string;
  sourceTag: string;
  status: "pending_review" | "applied" | "cancelled";
  diffRecords: ImportDiffRecord[];
  counts: { new: number; conflict: number; unchanged: number };
  createdAt: string;
}

export interface ApplyResult {
  created: number;
  updated: number;
  skipped: number;
}

export async function startMohImport(body: {
  sourceTag: string;
  sourceType: "json";
  records: MohRecord[];
}): Promise<{ jobId: string }> {
  throw new Error("not implemented");
}

export async function getImportJob(jobId: string): Promise<ImportJob> {
  throw new Error("not implemented");
}

export async function updateImportResolutions(
  jobId: string,
  resolutions: { mohRegistryId: string; resolution: ImportResolution }[],
): Promise<ImportJob> {
  throw new Error("not implemented");
}

export async function applyImport(jobId: string): Promise<ApplyResult> {
  throw new Error("not implemented");
}

export async function cancelImport(jobId: string): Promise<void> {
  throw new Error("not implemented");
}

// ─── Config & Analytics ────────────────────────────────────────────────────
// GET   /api/v1/admin/config
// PUT   /api/v1/admin/config
// GET   /api/v1/admin/logs
// GET   /api/v1/admin/clinics
// PATCH /api/v1/admin/clinics/:clinicId
// GET   /api/v1/admin/users
// PATCH /api/v1/admin/users/:userId

export interface SystemConfig {
  searchRadiusKm: number;
  geminiDailyBudgetUSD: number;
  [key: string]: unknown;
}

export interface AdminLog {
  id: string;
  type: string;
  actorId?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminLogResult {
  data: AdminLog[];
  cursor?: string | null;
}

export interface AdminClinic {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  specialty: string;
  status: string;
  verified: boolean;
  operationalStatus: string;
  createdAt: string;
}

export interface AdminClinicListResult {
  data: AdminClinic[];
  cursor?: string | null;
}

export interface AdminUser {
  id: string;
  phone: string;
  role: string;
  status: string;
  clinicId?: string | null;
  firstName?: string | null;
  lastLogin?: string | null;
  createdAt: string;
}

export interface AdminUserListResult {
  data: AdminUser[];
  cursor?: string | null;
}

export async function getConfig(): Promise<SystemConfig> {
  throw new Error("not implemented");
}

export async function updateConfig(patch: Partial<SystemConfig>): Promise<SystemConfig> {
  throw new Error("not implemented");
}

export async function listLogs(params?: {
  type?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminLogResult> {
  throw new Error("not implemented");
}

export async function listAdminClinics(params?: {
  status?: string;
  verified?: boolean;
  q?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminClinicListResult> {
  throw new Error("not implemented");
}

export async function patchClinic(
  clinicId: string,
  patch: {
    status?: string;
    verified?: boolean;
    specialty?: string;
    name?: string;
    address?: string;
  },
): Promise<AdminClinic> {
  throw new Error("not implemented");
}

export async function listAdminUsers(params?: {
  role?: string;
  status?: string;
  phone?: string;
  clinicId?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminUserListResult> {
  throw new Error("not implemented");
}

export async function patchUser(
  userId: string,
  patch: { status?: string; role?: string },
): Promise<AdminUser> {
  throw new Error("not implemented");
}

// ─── HIS Keys ──────────────────────────────────────────────────────────────
// GET    /api/v1/admin/his-keys/:clinicId
// POST   /api/v1/admin/his-keys/:clinicId
// DELETE /api/v1/admin/his-keys/:clinicId

export interface HisKeyMeta {
  clinicId: string;
  maskedKey: string | null;
  status: "active" | "revoked" | null;
  createdAt?: string | null;
}

export interface HisKeyGenResult {
  rawKey: string;
  maskedKey: string;
  clinicId: string;
}

export async function getHisKeyMeta(clinicId: string): Promise<HisKeyMeta> {
  throw new Error("not implemented");
}

export async function generateHisKey(clinicId: string): Promise<HisKeyGenResult> {
  throw new Error("not implemented");
}

export async function revokeHisKey(clinicId: string): Promise<void> {
  throw new Error("not implemented");
}
