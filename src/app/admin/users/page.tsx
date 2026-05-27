"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Users,
  RefreshCw,
  Eye,
  KeyRound,
  LockOpen,
  UserCheck,
  UserX,
  ShieldAlert,
  Phone,
  Building2,
  Calendar,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { getSession, type AuthSession } from "@/lib/authSession";
import { ApiError } from "@/lib/api";
import {
  listAdminUsers,
  getAdminUser,
  patchUser,
  resetUserPassword,
  unlockUser,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
} from "@/lib/adminApi";
import { formatDate, cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  general_user:    "General",
  driver:          "Driver",
  clinic_admin:    "Clinic admin",
  clinic_operator: "Operator",
  system_admin:    "System admin",
};

const ROLE_TONE: Record<string, "blue" | "green" | "amber" | "gray" | "red"> = {
  general_user:    "gray",
  driver:          "blue",
  clinic_admin:    "green",
  clinic_operator: "amber",
  system_admin:    "red",
};

const STATUS_TONE: Record<string, "green" | "amber" | "gray" | "red"> = {
  active:               "green",
  pending_verification: "amber",
  deactivated:          "gray",
};

interface Filters {
  role: AdminUserRole | "";
  status: AdminUserStatus | "";
  phone: string;
  clinicId: string;
}

const EMPTY_FILTERS: Filters = { role: "", status: "", phone: "", clinicId: "" };

export default function AdminUsersPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [cursor, setCursor]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [detail, setDetail]   = useState<AdminUser | null>(null);
  const [acting, setActing]   = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ userId: string; devPassword?: string } | null>(null);
  // "now" is owned at the page level so child rows/modal stay pure during
  // render (the React purity rule forbids calling Date.now() inline).
  // It refreshes every 30s so the "locked" badge expires on its own.
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    queueMicrotask(() => setSession(getSession()));
  }, []);

  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (
    next: Filters,
    append = false,
    afterCursor?: string | null,
  ) => {
    if (!append) queueMicrotask(() => setLoading(true));
    try {
      const params: Parameters<typeof listAdminUsers>[0] = { limit: 50 };
      if (next.role)            params.role     = next.role;
      if (next.status)          params.status   = next.status;
      if (next.phone.trim())    params.phone    = next.phone.trim();
      if (next.clinicId.trim()) params.clinicId = next.clinicId.trim();
      if (afterCursor)          params.cursor   = afterCursor;
      const result = await listAdminUsers(params);
      setUsers((prev) => (append ? [...prev, ...result.data] : result.data));
      setCursor(result.nextCursor);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listAdminUsers({ limit: 50 })
      .then((r) => {
        if (cancelled) return;
        setUsers(r.data);
        setCursor(r.nextCursor);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setUsers([]);
        setCursor(null);
        setError(e instanceof ApiError ? e.message : "Could not load users.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function applyFilters() {
    void load(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    void load(EMPTY_FILTERS);
  }

  async function openDetail(user: AdminUser) {
    setDetail(user); // optimistic open
    try {
      const fresh = await getAdminUser(user.id);
      setDetail(fresh);
    } catch (e) {
      // detail still shows the row data we already had
      toast.error(e instanceof ApiError ? e.message : "Couldn't fetch full record.");
    }
  }

  async function actToggleStatus(user: AdminUser) {
    const targetStatus: AdminUserStatus =
      user.status === "deactivated" ? "active" : "deactivated";
    const verb = targetStatus === "deactivated" ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${verb} ${user.phone}?`)) return;
    setActing(user.id);
    try {
      await patchUser(user.id, { status: targetStatus });
      toast.success(`${verb}d ${user.phone}`);
      void load(filters);
      if (detail?.id === user.id) {
        setDetail({ ...user, status: targetStatus });
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : `Couldn't ${verb.toLowerCase()}.`);
    } finally {
      setActing(null);
    }
  }

  async function actReset(user: AdminUser) {
    if (!window.confirm(
      `Reset password for ${user.phone}?\n\n` +
        `This invalidates the current password and refresh token. ` +
        `A fresh temporary password is SMSed to the user.`,
    )) return;
    setActing(user.id);
    try {
      const r = await resetUserPassword(user.id);
      setResetResult(r);
      toast.success("Password reset.");
      void load(filters);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't reset password.");
    } finally {
      setActing(null);
    }
  }

  async function actUnlock(user: AdminUser) {
    setActing(user.id);
    try {
      const r = await unlockUser(user.id);
      toast.success(r.wasLocked ? "Account unlocked." : "Account wasn't locked.");
      void load(filters);
      if (detail?.id === user.id) {
        setDetail({ ...user, lockedUntil: null, failedLoginAttempts: 0 });
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't unlock.");
    } finally {
      setActing(null);
    }
  }

  if (!session) return null;

  const initials = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  const hasFilters = Object.values(filters).some((v) => v && v.length > 0);

  return (
    <>
      <Header
        title="Users"
        subtitle="Search, inspect, and moderate any user account."
        user={headerUser}
      />
      <PageWrapper>
        <div className="max-w-6xl space-y-4">
          {/* Filters */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-blue" />
                Filters
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-brand-blue hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Role">
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value as AdminUserRole | "" })}
                  className={inputCls}
                >
                  <option value="">Any role</option>
                  {Object.entries(ROLE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as AdminUserStatus | "" })
                  }
                  className={inputCls}
                >
                  <option value="">Any status</option>
                  <option value="active">Active</option>
                  <option value="pending_verification">Pending verification</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </Field>
              <Field label="Phone (exact)">
                <input
                  type="tel"
                  value={filters.phone}
                  onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                  placeholder="+251911000001"
                  className={inputCls}
                />
              </Field>
              <Field label="Clinic ID">
                <input
                  type="text"
                  value={filters.clinicId}
                  onChange={(e) => setFilters({ ...filters, clinicId: e.target.value })}
                  placeholder="6a3e…"
                  className={cn(inputCls, "font-mono")}
                />
              </Field>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button type="button" onClick={applyFilters} disabled={loading}>
                Apply filters
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void load(filters)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </Card>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Table */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <CardTitle>
                {users.length}
                {cursor ? "+" : ""} user{users.length === 1 ? "" : "s"}
              </CardTitle>
            </div>

            {loading && users.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                Loading users…
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  No users match these filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-brand-gray">
                      {["Phone", "Role", "Status", "Clinic", "Last login", "Actions"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        now={now}
                        busy={acting === u.id}
                        onView={() => void openDetail(u)}
                        onToggleStatus={() => void actToggleStatus(u)}
                        onReset={() => void actReset(u)}
                        onUnlock={() => void actUnlock(u)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {cursor && !loading && (
              <div className="px-5 py-4 border-t border-brand-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void load(filters, true, cursor)}
                >
                  Load more
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Detail modal */}
        <UserDetailModal
          user={detail}
          now={now}
          onClose={() => setDetail(null)}
          onToggleStatus={() => detail && void actToggleStatus(detail)}
          onReset={() => detail && void actReset(detail)}
          onUnlock={() => detail && void actUnlock(detail)}
          busy={!!(detail && acting === detail.id)}
        />

        {/* Reset-password reveal */}
        <Modal
          open={!!resetResult}
          onClose={() => setResetResult(null)}
          title="Temporary password issued"
          width="lg"
        >
          {resetResult && (
            <div className="space-y-4">
              {resetResult.devPassword ? (
                <>
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">
                      Plaintext password is only returned outside production. In
                      prod the user receives it via SMS only.
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      devPassword
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg px-3 py-2.5 break-all">
                        {resetResult.devPassword}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard.writeText(resetResult.devPassword!);
                          toast.success("Copied");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-700">
                  Password reset successfully. The new temporary password was
                  SMSed to the user.
                </p>
              )}
              <Button onClick={() => setResetResult(null)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}
        </Modal>
      </PageWrapper>
    </>
  );
}

/* ─────── row ─────── */

function UserRow({
  user,
  now,
  busy,
  onView,
  onToggleStatus,
  onReset,
  onUnlock,
}: {
  user: AdminUser;
  now: number;
  busy: boolean;
  onView: () => void;
  onToggleStatus: () => void;
  onReset: () => void;
  onUnlock: () => void;
}) {
  const isLocked =
    !!user.lockedUntil && new Date(user.lockedUntil).getTime() > now;
  const clinicId = user.clinicId ?? user.clinicRef?.clinicId ?? null;
  return (
    <tr className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors">
      <td className="px-5 py-3">
        <p className="text-sm font-mono text-gray-900">{user.phone}</p>
        {(user.name || user.firstName) && (
          <p className="text-xs text-gray-500 truncate max-w-[200px]">
            {user.name ?? user.firstName}
          </p>
        )}
      </td>
      <td className="px-5 py-3">
        <Badge variant={ROLE_TONE[user.role] ?? "gray"}>
          {ROLE_LABEL[user.role] ?? user.role}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <Badge variant={STATUS_TONE[user.status] ?? "gray"}>
          {user.status.replace(/_/g, " ")}
        </Badge>
        {isLocked && (
          <Badge variant="red" className="ml-1">
            <ShieldAlert className="h-3 w-3" /> locked
          </Badge>
        )}
      </td>
      <td className="px-5 py-3 text-xs text-gray-500 font-mono truncate max-w-[180px]">
        {clinicId ?? "—"}
      </td>
      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
        {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
            Details
          </Button>
          {isLocked && (
            <Button size="sm" variant="outline" onClick={onUnlock} disabled={busy}>
              <LockOpen className="h-3.5 w-3.5" />
              Unlock
            </Button>
          )}
          {user.status !== "deactivated" && (
            <Button size="sm" variant="outline" onClick={onReset} disabled={busy}>
              <KeyRound className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          {user.status === "deactivated" ? (
            <Button size="sm" onClick={onToggleStatus} loading={busy}>
              <UserCheck className="h-3.5 w-3.5" />
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={onToggleStatus} disabled={busy}>
              <UserX className="h-3.5 w-3.5" />
              Deactivate
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─────── detail modal ─────── */

function UserDetailModal({
  user,
  now,
  onClose,
  onToggleStatus,
  onReset,
  onUnlock,
  busy,
}: {
  user: AdminUser | null;
  now: number;
  onClose: () => void;
  onToggleStatus: () => void;
  onReset: () => void;
  onUnlock: () => void;
  busy: boolean;
}) {
  if (!user) return null;
  const clinicId = user.clinicId ?? user.clinicRef?.clinicId ?? null;
  const isLocked =
    !!user.lockedUntil && new Date(user.lockedUntil).getTime() > now;
  return (
    <Modal open={!!user} onClose={onClose} width="xl" title={`User · ${user.phone}`}>
      <div className="space-y-5">
        <div className="rounded-xl bg-brand-gray border border-brand-border px-4 py-3 flex flex-wrap items-center gap-2">
          <Badge variant={ROLE_TONE[user.role] ?? "gray"}>
            {ROLE_LABEL[user.role] ?? user.role}
          </Badge>
          <Badge variant={STATUS_TONE[user.status] ?? "gray"}>
            {user.status.replace(/_/g, " ")}
          </Badge>
          {isLocked && (
            <Badge variant="red">
              <ShieldAlert className="h-3 w-3" /> locked until{" "}
              {user.lockedUntil ? formatDate(user.lockedUntil) : "—"}
            </Badge>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <DetailCard title="Account" icon={Users}>
            <Field label="User ID">
              <code className="font-mono text-xs">{user.id}</code>
            </Field>
            <Field label="Phone">
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="h-3 w-3 text-gray-400" />
                {user.phone}
              </span>
            </Field>
            {(user.name || user.firstName) && (
              <Field label="Name">{user.name ?? user.firstName}</Field>
            )}
            <Field label="Created">{formatDate(user.createdAt)}</Field>
            <Field label="Last login">
              {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
            </Field>
          </DetailCard>

          <DetailCard title="Clinic & access" icon={Building2}>
            <Field label="Clinic ID">
              {clinicId ? (
                <code className="font-mono text-xs">{clinicId}</code>
              ) : (
                <span className="text-gray-400 italic">Not bound to a clinic</span>
              )}
            </Field>
            {user.clinicRef?.invitedByAdminId && (
              <Field label="Invited by">
                <code className="font-mono text-xs">
                  {user.clinicRef.invitedByAdminId}
                </code>
              </Field>
            )}
            {user.driverProfile && (
              <Field label="Driver profile">
                <span className="inline-flex items-center gap-2">
                  <Badge variant={user.driverProfile.onDuty ? "green" : "gray"}>
                    {user.driverProfile.onDuty ? "on duty" : "off duty"}
                  </Badge>
                  {user.driverProfile.firstName && (
                    <span className="text-xs text-gray-500">
                      {user.driverProfile.firstName}
                    </span>
                  )}
                </span>
              </Field>
            )}
            <Field label="Failed login attempts">
              {user.failedLoginAttempts ?? 0}
            </Field>
            {user.lockedUntil && (
              <Field label="Locked until">
                <span className="inline-flex items-center gap-1 text-brand-red">
                  <Calendar className="h-3 w-3" />
                  {formatDate(user.lockedUntil)}
                </span>
              </Field>
            )}
          </DetailCard>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-brand-border">
          {isLocked && (
            <Button onClick={onUnlock} disabled={busy} variant="outline">
              <LockOpen className="h-4 w-4" />
              Unlock account
            </Button>
          )}
          {user.status !== "deactivated" && (
            <Button onClick={onReset} disabled={busy} variant="outline">
              <KeyRound className="h-4 w-4" />
              Reset password
            </Button>
          )}
          {user.status === "deactivated" ? (
            <Button onClick={onToggleStatus} loading={busy}>
              <UserCheck className="h-4 w-4" />
              Reactivate
            </Button>
          ) : (
            <Button variant="danger" onClick={onToggleStatus} disabled={busy}>
              <UserX className="h-4 w-4" />
              Deactivate
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </div>

        <p className="text-[11px] text-gray-400">
          Deactivating your own admin account is blocked server-side. Reset
          password refuses on deactivated accounts — reactivate first.
        </p>
      </div>
    </Modal>
  );
}

/* ─────── bits ─────── */

const inputCls = cn(
  "w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900",
  "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue",
  "transition-colors border-brand-border",
);

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-gray-800">{children}</div>
    </div>
  );
}

function DetailCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-brand-border bg-brand-blue/5 text-brand-blue">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}
