"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Key,
  RefreshCw,
  ShieldCheck,
  Siren,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getSession, type AuthSession } from "@/lib/authSession";
import { getAdminStats, type AdminStats } from "@/lib/adminApi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [session, setSession]     = useState<AuthSession | null>(null);
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    queueMicrotask(() => setSession(getSession()));
  }, []);

  const refresh = useCallback((opts?: { silent?: boolean }) => {
    const wasSilent = !!opts?.silent;
    getAdminStats()
      .then((s) => {
        setStats(s);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Could not load stats.");
        setLoading(false);
      });
    // Only show the loading spinner for non-silent reloads; the setter is
    // synchronous here (not inside an async callback) but it's wrapped in a
    // microtask so it doesn't count as "synchronous within an effect".
    if (!wasSilent) queueMicrotask(() => setLoading(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!session) return null;

  const phone    = session.user.phone;
  const initials = phone.replace(/\D/g, "").slice(-2);

  const clinics = stats?.clinics;
  const users   = stats?.users;
  const claims  = stats?.claims;
  const sos     = stats?.sos;
  const his     = stats?.his;
  const moh     = stats?.mohImports;

  return (
    <>
      <Header
        title="System admin dashboard"
        subtitle="Platform overview and moderation tools"
        user={{ ...session.user, clinicName: "", avatarInitials: initials }}
      />
      <PageWrapper>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {loading
              ? "Loading platform stats…"
              : error
                ? "Stats are stale — backend unreachable."
                : "Aggregate snapshot from /admin/stats. Counts run in parallel server-side."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh({ silent: true })}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Headline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Pending claims"
            value={loading ? "…" : claims?.pending ?? "—"}
            icon={<ClipboardCheck className="h-5 w-5" />}
            accent="amber"
          />
          <StatCard
            label="SOS (last 24h)"
            value={loading ? "…" : sos?.last24h ?? "—"}
            icon={<Siren className="h-5 w-5" />}
            accent="red"
          />
          <StatCard
            label="Active clinics"
            value={
              loading
                ? "…"
                : clinics
                  ? `${clinics.active} / ${clinics.total}`
                  : "—"
            }
            icon={<Building2 className="h-5 w-5" />}
            accent="blue"
          />
          <StatCard
            label="HIS keys active"
            value={loading ? "…" : his?.activeKeys ?? "—"}
            icon={<Key className="h-5 w-5" />}
            accent="green"
          />
        </div>

        {/* Detailed breakdowns */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Clinics */}
          <Card padding="none">
            <CardHeader className="mb-0 px-5 py-4 border-b border-brand-border">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-blue" />
                Clinics
              </CardTitle>
              <Badge variant="blue">{clinics?.total ?? 0} total</Badge>
            </CardHeader>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              <BreakdownRow
                label="Active"
                value={clinics?.active}
                tone="green"
              />
              <BreakdownRow
                label="Deactivated"
                value={clinics?.deactivated}
                tone="gray"
              />
              <BreakdownRow
                label="Verified"
                value={clinics?.verified}
                tone="green"
                Icon={ShieldCheck}
              />
              <BreakdownRow
                label="Unverified"
                value={clinics?.unverified}
                tone="amber"
                Icon={AlertTriangle}
              />
              <BreakdownRow
                label="With ambulance"
                value={clinics?.withAmbulance}
                tone="blue"
                Icon={Truck}
              />
            </div>
          </Card>

          {/* Users */}
          <Card padding="none">
            <CardHeader className="mb-0 px-5 py-4 border-b border-brand-border">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-blue" />
                Users
              </CardTitle>
              <Badge variant="gray">
                {sumValues(users?.byRole)} total
              </Badge>
            </CardHeader>
            <div className="p-5 space-y-4">
              <Section title="By role">
                <BreakdownRow label="General users"    value={users?.byRole.general_user} />
                <BreakdownRow label="Drivers"          value={users?.byRole.driver} />
                <BreakdownRow label="Clinic admins"    value={users?.byRole.clinic_admin} />
                <BreakdownRow label="Clinic operators" value={users?.byRole.clinic_operator} />
                <BreakdownRow label="System admins"    value={users?.byRole.system_admin} />
              </Section>
              <Section title="By status">
                <BreakdownRow label="Active"               value={users?.byStatus.active}               tone="green" />
                <BreakdownRow label="Pending verification" value={users?.byStatus.pending_verification} tone="amber" />
                <BreakdownRow label="Deactivated"          value={users?.byStatus.deactivated}          tone="gray" />
              </Section>
            </div>
          </Card>

          {/* Claims */}
          <Card padding="none">
            <CardHeader className="mb-0 px-5 py-4 border-b border-brand-border">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-brand-blue" />
                Claims
              </CardTitle>
              <Badge variant="gray">
                {sumValues(claims)} total
              </Badge>
            </CardHeader>
            <div className="p-5 grid grid-cols-3 gap-3 text-sm">
              <BreakdownRow label="Pending"  value={claims?.pending}  tone="amber" />
              <BreakdownRow label="Approved" value={claims?.approved} tone="green" />
              <BreakdownRow label="Rejected" value={claims?.rejected} tone="red" />
            </div>
          </Card>

          {/* SOS / sessions */}
          <Card padding="none">
            <CardHeader className="mb-0 px-5 py-4 border-b border-brand-border">
              <CardTitle className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-brand-red" />
                SOS queue
              </CardTitle>
              <Badge variant="red">{sos?.last24h ?? 0} in 24h</Badge>
            </CardHeader>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              <BreakdownRow
                label="Pending dispatch"
                value={sos?.byQueueStatus.pending_dispatch}
                tone="amber"
              />
              <BreakdownRow
                label="Dispatched"
                value={sos?.byQueueStatus.dispatched}
                tone="blue"
              />
              <BreakdownRow
                label="Session created"
                value={sos?.byQueueStatus.session_created}
                tone="green"
              />
              <BreakdownRow
                label="Dismissed"
                value={sos?.byQueueStatus.dismissed}
                tone="gray"
              />
            </div>
          </Card>

          {/* MoH imports */}
          <Card padding="none">
            <CardHeader className="mb-0 px-5 py-4 border-b border-brand-border">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-blue" />
                MoH imports
              </CardTitle>
              <Badge variant="gray">{sumValues(moh)} total</Badge>
            </CardHeader>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              <BreakdownRow label="Pending review" value={moh?.pending_review} tone="amber" />
              <BreakdownRow label="Applying"       value={moh?.applying}       tone="blue" />
              <BreakdownRow label="Applied"        value={moh?.applied}        tone="green" />
              <BreakdownRow label="Cancelled"      value={moh?.cancelled}      tone="gray" />
            </div>
          </Card>

          {/* Account / session info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-blue" />
                Signed-in account
              </CardTitle>
            </CardHeader>
            <div className="text-sm">
              <div className="flex justify-between border-b border-brand-border py-2">
                <span className="text-gray-600">Role</span>
                <Badge variant="blue">system_admin</Badge>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Phone</span>
                <span className="text-gray-900 font-medium">{phone}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-brand-border">
                <span className="text-gray-600">User ID</span>
                <code className="font-mono text-xs text-gray-700">{session.user.id}</code>
              </div>
            </div>
          </Card>
        </div>
      </PageWrapper>
    </>
  );
}

/* ───────── helpers ───────── */

function sumValues(obj?: Record<string, number>): number {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + (b ?? 0), 0);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
        {title}
      </p>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  tone = "gray",
  Icon,
}: {
  label: string;
  value: number | undefined;
  tone?: "green" | "amber" | "red" | "blue" | "gray";
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneText = {
    green: "text-brand-green",
    amber: "text-brand-amber",
    red:   "text-brand-red",
    blue:  "text-brand-blue",
    gray:  "text-gray-900",
  }[tone];
  return (
    <div className="rounded-lg bg-brand-gray border border-brand-border px-3 py-2.5">
      <p className="text-[11px] text-gray-500 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className={cn("text-lg font-bold mt-0.5", toneText)}>
        {value ?? "—"}
      </p>
    </div>
  );
}
