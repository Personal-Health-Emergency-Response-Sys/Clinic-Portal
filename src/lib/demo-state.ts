import type {
  PortalClinic,
  PortalDriver,
  PortalOperator,
  SosQueueItem,
  InviteResult,
} from "./portalApi";
import type {
  AdminClaim,
  AdminClaimClinic,
  AdminClinic,
  AdminClinicListResult,
  AdminClinicPatch,
  AdminLog,
  AdminLogListResult,
  AdminLogTargetType,
  AdminStats,
  AdminUser,
  AdminUserListResult,
  AdminUserPatch,
  AdminUserRole,
  AdminUserStatus,
  ApplyResult,
  ClaimActionResult,
  ClaimListResult,
  HisKeyGenResult,
  HisKeyMeta,
  ImportDiffRecord,
  ImportJob,
  ImportResolution,
  MohRecord,
  ResetPasswordResult,
  SystemConfig,
  UnlockUserResult,
} from "./adminApi";

const tick = () => new Promise<void>((r) => setTimeout(r, 100));

function isoHoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function isoMinutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildClinic(): PortalClinic {
  return {
    id: "clinic-demo-1",
    name: "Addis Community Health Center (Demo)",
    type: "clinic",
    address: "Bole Road, Addis Ababa",
    specialty: "general",
    location: { type: "Point", coordinates: [38.7469, 9.032] },
    phones: [
      { number: "+251911100001", priority: 1, label: "Emergency" },
      { number: "+251911100002", priority: 2, label: "Reception" },
    ],
    operationalStatus: "Available",
    effectiveStatus: "Available",
    statusIsStale: false,
    statusSource: "portal",
    statusExpiry: isoHoursFromNow(6),
    ambulanceAvailable: true,
    ambulanceCountAvailable: 2,
    ambulanceExpiry: isoHoursFromNow(4),
    ambulanceIsActive: true,
    verified: true,
    status: "active",
  };
}

function buildQueue(): SosQueueItem[] {
  const exp = new Date(Date.now() + 8 * 60_000).toISOString();
  return [
    {
      sosAttemptId: "sos-demo-pending-1",
      queueStatus: "pending_dispatch",
      triggeredAt: isoMinutesAgo(4),
      elapsedSeconds: 4 * 60,
      patientPhone: "+251912345678",
      userLocation: { lat: 9.0281, lng: 38.7402 },
      urgencyLevel: "high",
      recommendedSpecialty: "general",
      selectionMethod: "geo_score",
      assignment: null,
    },
    {
      sosAttemptId: "sos-demo-dispatched-1",
      queueStatus: "dispatched",
      triggeredAt: isoMinutesAgo(18),
      elapsedSeconds: 18 * 60,
      patientPhone: "+251977001122",
      userLocation: { lat: 9.035, lng: 38.752 },
      urgencyLevel: "medium",
      recommendedSpecialty: "general",
      selectionMethod: "geo_score",
      assignment: {
        assignmentId: "asgn-demo-1",
        driverId: "driver-demo-1",
        driverPhone: "+251911200001",
        driverName: "Dawit",
        expiresAt: exp,
        secondsLeft: Math.max(0, Math.floor((new Date(exp).getTime() - Date.now()) / 1000)),
      },
    },
  ];
}

function buildDrivers(): PortalDriver[] {
  const base = new Date(Date.now() - 2 * 3600_000).toISOString();
  return [
    {
      id: "driver-demo-1",
      phone: "+251911200001",
      firstName: "Dawit",
      onDuty: true,
      status: "active",
      lastLogin: base,
      createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
    },
    {
      id: "driver-demo-2",
      phone: "+251911200002",
      firstName: "Hanna",
      onDuty: false,
      status: "active",
      lastLogin: null,
      createdAt: new Date(Date.now() - 60 * 86400_000).toISOString(),
    },
    {
      id: "driver-demo-3",
      phone: "+251911200003",
      firstName: "Yonas",
      onDuty: true,
      status: "active",
      lastLogin: new Date(Date.now() - 30 * 60_000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
    },
  ];
}

function buildOperators(): PortalOperator[] {
  return [
    {
      id: "op-demo-1",
      phone: "+251911300001",
      status: "active",
      lastLogin: new Date(Date.now() - 3 * 3600_000).toISOString(),
      createdAt: new Date(Date.now() - 120 * 86400_000).toISOString(),
    },
    {
      id: "op-demo-2",
      phone: "+251911300002",
      status: "pending_verification",
      lastLogin: null,
      createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    },
  ];
}

type DemoState = {
  clinic: PortalClinic;
  queue: SosQueueItem[];
  drivers: PortalDriver[];
  operators: PortalOperator[];
};

const state: DemoState = {
  clinic: buildClinic(),
  queue: buildQueue(),
  drivers: buildDrivers(),
  operators: buildOperators(),
};

function refreshAssignmentTimers() {
  const now = Date.now();
  for (const row of state.queue) {
    if (row.assignment) {
      const left = Math.floor((new Date(row.assignment.expiresAt).getTime() - now) / 1000);
      row.assignment.secondsLeft = Math.max(0, left);
    }
  }
}

export async function demoFetchClinic(): Promise<PortalClinic> {
  await tick();
  refreshAssignmentTimers();
  return structuredClone(state.clinic);
}

export async function demoUpdateProfile(body: Record<string, unknown>): Promise<PortalClinic> {
  await tick();
  const c = state.clinic;
  if (typeof body.name === "string") c.name = body.name;
  if (body.type === "clinic" || body.type === "hospital") c.type = body.type;
  if ("address" in body && typeof body.address === "string") c.address = body.address || null;
  if (typeof body.specialty === "string") c.specialty = body.specialty;
  const loc = body.location as { lat?: number; lng?: number } | undefined;
  if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
    c.location = { type: "Point", coordinates: [loc.lng, loc.lat] };
  }
  return structuredClone(c);
}

export async function demoUpdatePhones(phones: PortalClinic["phones"]): Promise<PortalClinic> {
  await tick();
  state.clinic.phones = phones.map((p, i) => ({
    number: p.number,
    priority: i + 1,
    ...(p.label ? { label: p.label } : {}),
  }));
  return structuredClone(state.clinic);
}

export async function demoUpdateStatus(status: string, note?: string): Promise<PortalClinic> {
  await tick();
  void note;
  state.clinic.operationalStatus = status;
  state.clinic.effectiveStatus = status;
  state.clinic.statusIsStale = false;
  state.clinic.statusExpiry = isoHoursFromNow(8);
  return structuredClone(state.clinic);
}

export async function demoUpdateAmbulance(available: boolean, count?: number): Promise<PortalClinic> {
  await tick();
  const c = state.clinic;
  c.ambulanceAvailable = available;
  if (available) {
    const n = Math.min(50, Math.max(1, count ?? c.ambulanceCountAvailable ?? 1));
    c.ambulanceCountAvailable = n;
    c.ambulanceExpiry = isoHoursFromNow(4);
    c.ambulanceIsActive = true;
  } else {
    c.ambulanceCountAvailable = 0;
    c.ambulanceExpiry = null;
    c.ambulanceIsActive = false;
  }
  return structuredClone(c);
}

export async function demoFetchSosQueue(limit: number): Promise<SosQueueItem[]> {
  await tick();
  refreshAssignmentTimers();
  return structuredClone(state.queue.slice(0, limit));
}

export async function demoFetchDrivers(): Promise<PortalDriver[]> {
  await tick();
  return structuredClone(state.drivers.filter((d) => d.status !== "deactivated"));
}

export async function demoFetchOperators(): Promise<PortalOperator[]> {
  await tick();
  return structuredClone(state.operators);
}

export async function demoInviteDriver(body: {
  phone: string;
  email?: string | null;
  firstName?: string;
}): Promise<InviteResult> {
  await tick();
  void body.email;
  state.drivers.push({
    id: newId("driver"),
    phone: body.phone,
    firstName: body.firstName ?? null,
    onDuty: false,
    status: "pending_verification",
    lastLogin: null,
    createdAt: new Date().toISOString(),
  });
  return {
    invitationId: newId("inv"),
    type: "driver",
    inviteePhone: body.phone,
    expiresAt: isoHoursFromNow(72),
    devToken: "demo-invite-token-driver",
  };
}

export async function demoInviteOperator(body: {
  phone: string;
  email?: string | null;
  firstName?: string;
}): Promise<InviteResult> {
  await tick();
  void body.email;
  void body.firstName;
  state.operators.push({
    id: newId("op"),
    phone: body.phone,
    status: "pending_verification",
    lastLogin: null,
    createdAt: new Date().toISOString(),
  });
  return {
    invitationId: newId("inv"),
    type: "clinic_operator",
    inviteePhone: body.phone,
    expiresAt: isoHoursFromNow(72),
    devToken: "demo-invite-token-operator",
  };
}

export async function demoDeactivateDriver(id: string): Promise<{ id: string; status: string }> {
  await tick();
  const d = state.drivers.find((x) => x.id === id);
  if (d) d.status = "deactivated";
  return { id, status: "deactivated" };
}

export async function demoDeactivateOperator(id: string): Promise<{ id: string; status: string }> {
  await tick();
  const o = state.operators.find((x) => x.id === id);
  if (o) o.status = "deactivated";
  return { id, status: "deactivated" };
}

export async function demoAssignSos(sosAttemptId: string, driverId: string): Promise<unknown> {
  await tick();
  const row = state.queue.find((q) => q.sosAttemptId === sosAttemptId);
  if (!row) throw new Error("SOS not found");
  const driver = state.drivers.find((d) => d.id === driverId);
  const exp = new Date(Date.now() + 10 * 60_000).toISOString();
  row.queueStatus = "dispatched";
  row.assignment = {
    assignmentId: newId("asgn"),
    driverId,
    driverPhone: driver?.phone ?? null,
    driverName: driver?.firstName ?? null,
    expiresAt: exp,
    secondsLeft: 600,
  };
  return { ok: true };
}

export async function demoDismissSos(sosAttemptId: string, reason: string): Promise<unknown> {
  await tick();
  void reason;
  state.queue = state.queue.filter((q) => q.sosAttemptId !== sosAttemptId);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Admin demo state — separate from clinic-portal demo so it can be
// reasoned about independently.
// ──────────────────────────────────────────────────────────────────────────

function buildAdminClinics(): AdminClinic[] {
  const base = [
    {
      id: "6a15942a98ab2939ad52795a",
      name: "ALERT Comprehensive Specialized Hospital",
      type: "hospital",
      address: "zenebework, Woreda 1, Kolfe Sub city, Addis Ababa",
      specialty: "general",
      subSpecialty: "Comprehensive Specialized Hospital",
      verified: true,
      status: "active",
      mohRegistryId: "mfr-1000932",
      ambulanceAvailable: true,
      ambulanceCountAvailable: 3,
      operationalStatus: "Available",
      effectiveStatus: "Available",
    },
    {
      id: "6a3e0a1b2c3d4e5f60718293",
      name: "Tikur Anbessa Specialized Hospital",
      type: "hospital",
      address: "Lideta, Addis Ababa",
      specialty: "general",
      subSpecialty: "Specialized Hospital",
      verified: true,
      status: "active",
      mohRegistryId: "mfr-1000211",
    },
    {
      id: "6a3e0a1b2c3d4e5f60718297",
      name: "Hayat Medical Center",
      type: "clinic",
      address: "Mexico Square, Addis Ababa",
      specialty: "general",
      subSpecialty: "Higher Clinic",
      verified: false,
      status: "active",
      mohRegistryId: "mfr-1001234",
    },
    {
      id: "6a3e0a1b2c3d4e5f60718298",
      name: "Selam Health Center",
      type: "clinic",
      address: "Kazanchis, Addis Ababa",
      specialty: "general",
      subSpecialty: "Health Center",
      verified: false,
      status: "active",
      mohRegistryId: "mfr-1001567",
    },
    {
      id: "6a3e0a1b2c3d4e5f6071829a",
      name: "Adama General Hospital",
      type: "hospital",
      address: "Adama, Oromia",
      specialty: "general",
      subSpecialty: "General Hospital",
      verified: true,
      status: "deactivated",
      mohRegistryId: "mfr-1002001",
    },
  ];
  return base.map((c) => ({
    ...c,
    createdAt: new Date(Date.now() - 200 * 86400_000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
  }));
}

function buildAdminUsers(): AdminUser[] {
  const baseDate = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
  return [
    {
      id: "user-admin-1",
      phone: "+251911000004",
      role: "system_admin",
      status: "active",
      name: "System Admin",
      lastLogin: new Date(Date.now() - 30 * 60_000).toISOString(),
      failedLoginAttempts: 0,
      createdAt: baseDate(180),
    },
    {
      id: "user-admin-2",
      phone: "+251911000001",
      role: "clinic_admin",
      status: "active",
      name: "Abebe Bekele",
      clinicRef: { clinicId: "6a3e0a1b2c3d4e5f60718293" },
      clinicId: "6a3e0a1b2c3d4e5f60718293",
      lastLogin: new Date(Date.now() - 4 * 3600_000).toISOString(),
      failedLoginAttempts: 0,
      createdAt: baseDate(45),
    },
    {
      id: "user-op-1",
      phone: "+251911300001",
      role: "clinic_operator",
      status: "active",
      clinicRef: { clinicId: "6a3e0a1b2c3d4e5f60718293" },
      clinicId: "6a3e0a1b2c3d4e5f60718293",
      lastLogin: new Date(Date.now() - 3 * 3600_000).toISOString(),
      failedLoginAttempts: 0,
      createdAt: baseDate(120),
    },
    {
      id: "user-driver-1",
      phone: "+251911200001",
      role: "driver",
      status: "active",
      firstName: "Dawit",
      clinicRef: { clinicId: "6a3e0a1b2c3d4e5f60718293" },
      clinicId: "6a3e0a1b2c3d4e5f60718293",
      driverProfile: { onDuty: true, firstName: "Dawit" },
      lastLogin: new Date(Date.now() - 2 * 3600_000).toISOString(),
      failedLoginAttempts: 0,
      createdAt: baseDate(90),
    },
    {
      id: "user-driver-2",
      phone: "+251911200002",
      role: "driver",
      status: "active",
      firstName: "Hanna",
      clinicRef: { clinicId: "6a3e0a1b2c3d4e5f60718293" },
      clinicId: "6a3e0a1b2c3d4e5f60718293",
      driverProfile: { onDuty: false, firstName: "Hanna" },
      lastLogin: null,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
      createdAt: baseDate(60),
    },
    {
      id: "user-driver-3",
      phone: "+251911200099",
      role: "driver",
      status: "deactivated",
      firstName: "Old Driver",
      clinicRef: { clinicId: "6a3e0a1b2c3d4e5f60718293" },
      clinicId: "6a3e0a1b2c3d4e5f60718293",
      lastLogin: baseDate(30),
      failedLoginAttempts: 0,
      createdAt: baseDate(220),
    },
    {
      id: "user-general-1",
      phone: "+251922334455",
      role: "general_user",
      status: "active",
      lastLogin: baseDate(1),
      failedLoginAttempts: 0,
      createdAt: baseDate(14),
    },
    {
      id: "user-general-2",
      phone: "+251922334466",
      role: "general_user",
      status: "pending_verification",
      lastLogin: null,
      failedLoginAttempts: 0,
      createdAt: baseDate(0.1),
    },
  ];
}

function defaultConfig(): SystemConfig {
  return {
    searchRadiusKm: 15,
    geminiDailyBudgetUSD: 50,
    perUserDailySessionLimit: 10,
    maxSosAttemptsPerUserPerHr: 3,
    maxLoginAttemptsPerWindow: 5,
    loginWindowMin: 15,
    ambulanceExpiryHours: 6,
    statusExpiryHours: 2,
    assignmentExpiryMin: 5,
    sessionTimeoutMin: 45,
    gpsIntervalSec: 5,
    aiReRankEnabled: false,
    optimalityWeights: {
      statusWeight: 0.3,
      distanceWeight: 0.25,
      etaWeight: 0.2,
      specialtyWeight: 0.15,
      historyWeight: 0.1,
    },
    fallbackEmergencyNumber: "907",
  };
}

function buildAdminClaims(clinics: AdminClinic[]): AdminClaim[] {
  const submitted = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const slim = (c: AdminClinic): AdminClaimClinic => ({
    id: c.id,
    name: c.name,
    type: c.type,
    address: c.address ?? null,
    specialty: c.specialty,
    subSpecialty: c.subSpecialty ?? null,
    verified: c.verified,
  });
  return [
    {
      id: "claim-pending-1",
      clinic: slim(clinics[2]),
      submitterFullName: "Bisre",
      submitterPhone: "+251902187650",
      status: "pending",
      businessLicenseUrl:
        "https://res.cloudinary.com/dyawsgmx0/image/upload/v1779863446/smarthers/claims/sample/license.png",
      medicalCertUrl:
        "https://res.cloudinary.com/dyawsgmx0/image/upload/v1779863447/smarthers/claims/sample/cert.png",
      createdUserId: null,
      submittedAt: submitted(2),
      reviewedAt: null,
    },
    {
      id: "claim-pending-2",
      clinic: slim(clinics[3]),
      submitterFullName: "Mekdes Tadesse",
      submitterPhone: "+251911555666",
      status: "pending",
      businessLicenseUrl: null,
      medicalCertUrl: null,
      createdUserId: null,
      submittedAt: submitted(18),
      reviewedAt: null,
    },
    {
      id: "claim-approved-1",
      clinic: slim(clinics[0]),
      submitterFullName: "Eyob Mengistu",
      submitterPhone: "+251911777888",
      status: "approved",
      businessLicenseUrl:
        "https://res.cloudinary.com/dyawsgmx0/image/upload/v1779863446/smarthers/claims/sample/license2.png",
      medicalCertUrl:
        "https://res.cloudinary.com/dyawsgmx0/image/upload/v1779863447/smarthers/claims/sample/cert2.png",
      createdUserId: "user-admin-2",
      submittedAt: submitted(72),
      reviewedAt: submitted(60),
    },
    {
      id: "claim-rejected-1",
      clinic: slim(clinics[1]),
      submitterFullName: "Bekele G/Mariam",
      submitterPhone: "+251911000099",
      status: "rejected",
      businessLicenseUrl: null,
      medicalCertUrl: null,
      rejectionReason:
        "Documents could not be verified — please resubmit clearer scans.",
      createdUserId: null,
      submittedAt: submitted(120),
      reviewedAt: submitted(110),
    },
  ];
}

function buildAdminLogs(): AdminLog[] {
  const at = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  return [
    {
      id: "log-1",
      type: "auth.login",
      actorId: "user-admin-1",
      targetType: "user",
      targetId: "user-admin-1",
      meta: { ip: "10.5.87.182", userAgent: "Chrome" },
      createdAt: at(1),
    },
    {
      id: "log-2",
      type: "admin.config_update",
      actorId: "user-admin-1",
      targetType: "system_config",
      targetId: "global",
      meta: { changed: ["searchRadiusKm"], from: 10, to: 15 },
      createdAt: at(8),
    },
    {
      id: "log-3",
      type: "clinic.claim_approved",
      actorId: "user-admin-1",
      targetType: "clinic",
      targetId: "6a15942a98ab2939ad52795a",
      meta: { claimId: "claim-approved-1", submitterPhone: "+251911777888" },
      createdAt: at(60),
    },
    {
      id: "log-4",
      type: "sos.attempt",
      actorId: "user-general-1",
      targetType: "sos_attempt",
      targetId: "sos-demo-pending-1",
      meta: { urgencyLevel: "high", patientPhone: "+251912345678" },
      createdAt: at(120),
    },
    {
      id: "log-5",
      type: "sos.assigned",
      actorId: "user-admin-2",
      targetType: "assignment",
      targetId: "asgn-demo-1",
      meta: { driverId: "user-driver-1", sosAttemptId: "sos-demo-dispatched-1" },
      createdAt: at(180),
    },
    {
      id: "log-6",
      type: "auth.login_failed",
      actorId: null,
      targetType: "user",
      targetId: "user-driver-2",
      meta: { reason: "bad_password", attempt: 5, locked: true },
      createdAt: at(240),
    },
    {
      id: "log-7",
      type: "his.status_push",
      actorId: null,
      targetType: "clinic",
      targetId: "6a15942a98ab2939ad52795a",
      meta: { source: "his_api", status: "Busy", capacity: 0 },
      createdAt: at(360),
    },
    {
      id: "log-8",
      type: "driver.invited",
      actorId: "user-admin-2",
      targetType: "user",
      targetId: "user-driver-2",
      meta: { phone: "+251911200002", firstName: "Hanna" },
      createdAt: at(600),
    },
  ];
}

interface AdminDemoState {
  clinics: AdminClinic[];
  users: AdminUser[];
  claims: AdminClaim[];
  config: SystemConfig;
  logs: AdminLog[];
  hisKeys: Record<string, HisKeyMeta>;
  importJobs: Record<string, ImportJob>;
}

const adminClinics = buildAdminClinics();
const adminState: AdminDemoState = {
  clinics: adminClinics,
  users: buildAdminUsers(),
  claims: buildAdminClaims(adminClinics),
  config: defaultConfig(),
  logs: buildAdminLogs(),
  hisKeys: {
    [adminClinics[0].id]: {
      clinicId: adminClinics[0].id,
      maskedKey: "sk_his_••••••••••••8a3f",
      status: "active",
      createdAt: new Date(Date.now() - 14 * 86400_000).toISOString(),
      revokedAt: null,
    },
  },
  importJobs: {},
};

// ─── Stats ────────────────────────────────────────────────────────────────

export async function demoStats(): Promise<AdminStats> {
  await tick();
  const c = adminState.clinics;
  const u = adminState.users;
  const cl = adminState.claims;

  const byRole = (r: AdminUserRole) => u.filter((x) => x.role === r).length;
  const byStatus = (s: AdminUserStatus) => u.filter((x) => x.status === s).length;

  return {
    clinics: {
      total:         c.length,
      active:        c.filter((x) => x.status === "active").length,
      deactivated:   c.filter((x) => x.status === "deactivated").length,
      verified:      c.filter((x) => x.verified).length,
      unverified:    c.filter((x) => !x.verified).length,
      withAmbulance: c.filter((x) => x.ambulanceAvailable).length,
    },
    users: {
      byRole: {
        general_user:    byRole("general_user"),
        driver:          byRole("driver"),
        clinic_admin:    byRole("clinic_admin"),
        clinic_operator: byRole("clinic_operator"),
        system_admin:    byRole("system_admin"),
      },
      byStatus: {
        pending_verification: byStatus("pending_verification"),
        active:               byStatus("active"),
        deactivated:          byStatus("deactivated"),
      },
    },
    claims: {
      pending:  cl.filter((x) => x.status === "pending").length,
      approved: cl.filter((x) => x.status === "approved").length,
      rejected: cl.filter((x) => x.status === "rejected").length,
    },
    sessions: {
      Created: 12, Accepted: 9, EnRoute: 4, Arrived: 2,
      PickedUp: 6, Completed: 47, CancelledOrTimeout: 3,
    },
    sos: {
      byQueueStatus: {
        pending_dispatch: state.queue.filter((q) => q.queueStatus === "pending_dispatch").length,
        dispatched:       state.queue.filter((q) => q.queueStatus === "dispatched").length,
        session_created:  6,
        dismissed:        2,
      },
      last24h: 14,
    },
    his: {
      activeKeys: Object.values(adminState.hisKeys).filter((k) => k.status === "active").length,
    },
    mohImports: {
      pending_review: Object.values(adminState.importJobs).filter((j) => j.status === "pending_review").length,
      applying:       Object.values(adminState.importJobs).filter((j) => j.status === "applying").length,
      applied:        Object.values(adminState.importJobs).filter((j) => j.status === "applied").length,
      cancelled:      Object.values(adminState.importJobs).filter((j) => j.status === "cancelled").length,
    },
  };
}

// ─── Claims ───────────────────────────────────────────────────────────────

export async function demoListClaims(params: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
}): Promise<ClaimListResult> {
  await tick();
  const filtered = params.status
    ? adminState.claims.filter((c) => c.status === params.status)
    : adminState.claims;
  return {
    data: structuredClone(filtered.slice(0, params.limit ?? 50)),
    nextCursor: null,
  };
}

export async function demoApproveClaim(claimId: string): Promise<ClaimActionResult> {
  await tick();
  const claim = adminState.claims.find((c) => c.id === claimId);
  if (!claim) throw new Error("Claim not found");
  claim.status = "approved";
  claim.reviewedAt = new Date().toISOString();
  claim.createdUserId = `user-${Math.random().toString(36).slice(2, 8)}`;
  const clinic = adminState.clinics.find((c) => c.id === claim.clinic.id);
  if (clinic) {
    clinic.verified = true;
    clinic.status = "active";
  }
  return {
    claimId: claim.id,
    clinicId: claim.clinic.id,
    status: "approved",
    createdUserId: claim.createdUserId,
  };
}

export async function demoRejectClaim(
  claimId: string,
  reason: string,
): Promise<ClaimActionResult> {
  await tick();
  const claim = adminState.claims.find((c) => c.id === claimId);
  if (!claim) throw new Error("Claim not found");
  claim.status = "rejected";
  claim.reviewedAt = new Date().toISOString();
  claim.rejectionReason = reason;
  return {
    claimId: claim.id,
    clinicId: claim.clinic.id,
    status: "rejected",
    rejectionReason: reason,
  };
}

// ─── Clinics ──────────────────────────────────────────────────────────────

export async function demoListAdminClinics(params: {
  status?: "active" | "deactivated";
  verified?: boolean;
  q?: string;
  limit?: number;
}): Promise<AdminClinicListResult> {
  await tick();
  let rows = [...adminState.clinics];
  if (params.status) rows = rows.filter((c) => c.status === params.status);
  if (typeof params.verified === "boolean")
    rows = rows.filter((c) => c.verified === params.verified);
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter((c) => `${c.name} ${c.address ?? ""}`.toLowerCase().includes(q));
  }
  return {
    data: structuredClone(rows.slice(0, params.limit ?? 50)),
    nextCursor: null,
  };
}

export async function demoFetchAdminClinic(clinicId: string): Promise<AdminClinic> {
  await tick();
  const c = adminState.clinics.find((x) => x.id === clinicId);
  if (!c) throw new Error("Clinic not found");
  return structuredClone(c);
}

export async function demoPatchAdminClinic(
  clinicId: string,
  patch: AdminClinicPatch,
): Promise<AdminClinic> {
  await tick();
  const c = adminState.clinics.find((x) => x.id === clinicId);
  if (!c) throw new Error("Clinic not found");
  if (patch.status   !== undefined) c.status = patch.status;
  if (patch.verified !== undefined) c.verified = patch.verified;
  if (patch.name     !== undefined) c.name = patch.name;
  if (patch.address  !== undefined) c.address = patch.address;
  if (patch.specialty !== undefined) c.specialty = patch.specialty;
  if (patch.phones    !== undefined) c.phones = patch.phones.map((p) => ({ ...p }));
  if (patch.location  !== undefined) c.location = patch.location;
  if (patch.ambulanceAvailable !== undefined)
    c.ambulanceAvailable = patch.ambulanceAvailable;
  if (patch.ambulanceCountAvailable !== undefined)
    c.ambulanceCountAvailable = patch.ambulanceCountAvailable;
  c.updatedAt = new Date().toISOString();
  return structuredClone(c);
}

// ─── Users ────────────────────────────────────────────────────────────────

export async function demoListAdminUsers(params: {
  role?: AdminUserRole;
  status?: AdminUserStatus;
  phone?: string;
  clinicId?: string;
  limit?: number;
}): Promise<AdminUserListResult> {
  await tick();
  let rows = [...adminState.users];
  if (params.role)   rows = rows.filter((u) => u.role === params.role);
  if (params.status) rows = rows.filter((u) => u.status === params.status);
  if (params.phone)  rows = rows.filter((u) => u.phone === params.phone);
  if (params.clinicId)
    rows = rows.filter(
      (u) => u.clinicId === params.clinicId || u.clinicRef?.clinicId === params.clinicId,
    );
  return {
    data: structuredClone(rows.slice(0, params.limit ?? 50)),
    nextCursor: null,
  };
}

export async function demoFetchAdminUser(userId: string): Promise<AdminUser> {
  await tick();
  const u = adminState.users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found");
  return structuredClone(u);
}

export async function demoPatchAdminUser(
  userId: string,
  patch: AdminUserPatch,
): Promise<AdminUser> {
  await tick();
  const u = adminState.users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found");
  if (patch.status !== undefined) u.status = patch.status;
  if (patch.role   !== undefined) u.role = patch.role;
  u.updatedAt = new Date().toISOString();
  return structuredClone(u);
}

export async function demoResetUserPassword(userId: string): Promise<ResetPasswordResult> {
  await tick();
  const u = adminState.users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found");
  if (u.status === "deactivated") throw new Error("Reactivate the account first.");
  u.failedLoginAttempts = 0;
  u.lockedUntil = null;
  const devPassword = Array.from({ length: 12 })
    .map(() => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[
      Math.floor(Math.random() * 55)
    ])
    .join("");
  return { userId, devPassword };
}

export async function demoUnlockUser(userId: string): Promise<UnlockUserResult> {
  await tick();
  const u = adminState.users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found");
  const wasLocked =
    !!u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now();
  u.lockedUntil = null;
  u.failedLoginAttempts = 0;
  return { userId, wasLocked };
}

// ─── HIS keys ─────────────────────────────────────────────────────────────

export async function demoFetchHisKey(clinicId: string): Promise<HisKeyMeta> {
  await tick();
  const existing = adminState.hisKeys[clinicId];
  if (existing) return structuredClone(existing);
  return { clinicId, maskedKey: null, status: null, createdAt: null, revokedAt: null };
}

export async function demoGenerateHisKey(clinicId: string): Promise<HisKeyGenResult> {
  await tick();
  const raw =
    "sk_his_" +
    Array.from({ length: 32 })
      .map(() => "abcdef0123456789"[Math.floor(Math.random() * 16)])
      .join("");
  const masked = `sk_his_••••••••••••${raw.slice(-4)}`;
  const createdAt = new Date().toISOString();
  adminState.hisKeys[clinicId] = {
    clinicId,
    maskedKey: masked,
    status: "active",
    createdAt,
    revokedAt: null,
  };
  return { clinicId, rawKey: raw, maskedKey: masked, status: "active", createdAt };
}

export async function demoRevokeHisKey(
  clinicId: string,
): Promise<{ status: "revoked" }> {
  await tick();
  const existing = adminState.hisKeys[clinicId];
  if (!existing) throw new Error("No active key for this clinic");
  existing.status = "revoked";
  existing.revokedAt = new Date().toISOString();
  return { status: "revoked" };
}

// ─── Config ───────────────────────────────────────────────────────────────

export async function demoGetConfig(): Promise<SystemConfig> {
  await tick();
  return structuredClone(adminState.config);
}

export async function demoUpdateConfig(
  patch: Partial<SystemConfig>,
): Promise<SystemConfig> {
  await tick();
  adminState.config = { ...adminState.config, ...patch };
  // Append an audit-log entry so the /admin/logs page also reflects the change.
  adminState.logs.unshift({
    id: `log-${Date.now().toString(36)}`,
    type: "admin.config_update",
    actorId: "user-admin-1",
    targetType: "system_config",
    targetId: "global",
    meta: { changed: Object.keys(patch) },
    createdAt: new Date().toISOString(),
  });
  return structuredClone(adminState.config);
}

// ─── Logs ─────────────────────────────────────────────────────────────────

export async function demoListLogs(params: {
  type?: string;
  actorId?: string;
  targetType?: AdminLogTargetType;
  targetId?: string;
  since?: string;
  until?: string;
  limit?: number;
}): Promise<AdminLogListResult> {
  await tick();
  let rows = [...adminState.logs];
  if (params.type)       rows = rows.filter((l) => l.type === params.type);
  if (params.actorId)    rows = rows.filter((l) => l.actorId === params.actorId);
  if (params.targetType) rows = rows.filter((l) => l.targetType === params.targetType);
  if (params.targetId)   rows = rows.filter((l) => l.targetId === params.targetId);
  if (params.since) {
    const since = new Date(params.since).getTime();
    rows = rows.filter((l) => new Date(l.createdAt).getTime() >= since);
  }
  if (params.until) {
    const until = new Date(params.until).getTime();
    rows = rows.filter((l) => new Date(l.createdAt).getTime() <= until);
  }
  return {
    data: structuredClone(rows.slice(0, params.limit ?? 50)),
    nextCursor: null,
  };
}

// ─── MoH Import ───────────────────────────────────────────────────────────

function diffOne(rec: MohRecord): ImportDiffRecord {
  const existing = adminState.clinics.find(
    (c) => c.mohRegistryId === rec.mohRegistryId,
  );
  if (!existing) {
    return {
      mohRegistryId: rec.mohRegistryId,
      action: "new",
      resolution: "use_moh",
      incoming: rec,
      existing: null,
    };
  }
  const conflicts: string[] = [];
  if (existing.name !== rec.name) conflicts.push("name");
  if ((existing.address ?? "") !== (rec.address ?? "")) conflicts.push("address");
  if (existing.specialty !== rec.specialty) conflicts.push("specialty");
  return {
    mohRegistryId: rec.mohRegistryId,
    action: conflicts.length ? "conflict" : "unchanged",
    resolution: conflicts.length ? "pending" : "keep_current",
    incoming: rec,
    existing: {
      mohRegistryId: existing.mohRegistryId ?? rec.mohRegistryId,
      name: existing.name,
      type: existing.type,
      address: existing.address ?? undefined,
      specialty: existing.specialty,
    },
    conflictingFields: conflicts.length ? conflicts : null,
  };
}

export async function demoStartImport(body: {
  sourceTag: string;
  records: MohRecord[];
}): Promise<{ jobId: string }> {
  await tick();
  const jobId = `imp-${Date.now().toString(36)}`;
  const diffRecords = body.records.map(diffOne);
  const counts = {
    new:       diffRecords.filter((d) => d.action === "new").length,
    conflict:  diffRecords.filter((d) => d.action === "conflict").length,
    unchanged: diffRecords.filter((d) => d.action === "unchanged").length,
  };
  adminState.importJobs[jobId] = {
    jobId,
    sourceTag: body.sourceTag,
    status: "pending_review",
    diffRecords,
    counts,
    createdAt: new Date().toISOString(),
  };
  return { jobId };
}

export async function demoFetchImportJob(jobId: string): Promise<ImportJob> {
  await tick();
  const job = adminState.importJobs[jobId];
  if (!job) throw new Error("Import job not found");
  return structuredClone(job);
}

export async function demoUpdateImportResolutions(
  jobId: string,
  resolutions: { mohRegistryId: string; resolution: ImportResolution }[],
): Promise<ImportJob> {
  await tick();
  const job = adminState.importJobs[jobId];
  if (!job) throw new Error("Import job not found");
  if (job.status !== "pending_review")
    throw new Error("Resolutions can only be edited while job is pending review.");
  for (const r of resolutions) {
    const rec = job.diffRecords.find((d) => d.mohRegistryId === r.mohRegistryId);
    if (rec) rec.resolution = r.resolution;
  }
  return structuredClone(job);
}

export async function demoApplyImport(jobId: string): Promise<ApplyResult> {
  await tick();
  const job = adminState.importJobs[jobId];
  if (!job) throw new Error("Import job not found");
  const stillPending = job.diffRecords.some(
    (d) => d.action === "conflict" && d.resolution === "pending",
  );
  if (stillPending)
    throw new Error("Resolve all conflicting records before applying.");
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const rec of job.diffRecords) {
    if (rec.resolution === "skip" || rec.resolution === "keep_current") {
      skipped++;
      continue;
    }
    if (rec.action === "new") {
      adminState.clinics.push({
        id: `clinic-${rec.mohRegistryId}`,
        name: rec.incoming.name ?? "Unnamed",
        type: (rec.incoming.type as AdminClinic["type"]) ?? "clinic",
        address: rec.incoming.address ?? null,
        specialty: rec.incoming.specialty ?? "general",
        verified: true,
        status: "active",
        mohRegistryId: rec.mohRegistryId,
        createdAt: new Date().toISOString(),
      });
      created++;
    } else {
      const existing = adminState.clinics.find(
        (c) => c.mohRegistryId === rec.mohRegistryId,
      );
      if (existing) {
        if (rec.incoming.name)     existing.name = rec.incoming.name;
        if (rec.incoming.address)  existing.address = rec.incoming.address;
        if (rec.incoming.specialty) existing.specialty = rec.incoming.specialty;
        existing.updatedAt = new Date().toISOString();
        updated++;
      }
    }
  }
  job.status = "applied";
  return { created, updated, skipped, jobStatus: "applied" };
}

export async function demoCancelImport(
  jobId: string,
): Promise<{ jobStatus: "cancelled" }> {
  await tick();
  const job = adminState.importJobs[jobId];
  if (!job) throw new Error("Import job not found");
  if (job.status !== "pending_review")
    throw new Error("Only pending_review jobs can be cancelled.");
  job.status = "cancelled";
  return { jobStatus: "cancelled" };
}
