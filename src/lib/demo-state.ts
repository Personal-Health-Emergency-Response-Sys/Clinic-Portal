import type {
  PortalClinic,
  PortalDriver,
  PortalOperator,
  SosQueueItem,
  InviteResult,
} from "./portalApi";

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

let state: DemoState = {
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
