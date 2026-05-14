"use client";

import { useEffect, useMemo, useState } from "react";
import { Siren, Truck, Users, Activity, Phone, MapPin } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import {
  fetchPortalClinic,
  fetchSosQueue,
  fetchDrivers,
  type PortalClinic,
  type SosQueueItem,
  type PortalDriver,
} from "@/lib/portalApi";
import { ApiError } from "@/lib/api";
import Link from "next/link";

const QUEUE_BADGE: Record<string, { label: string; variant: "amber" | "blue" | "gray" }> = {
  pending_dispatch: { label: "Needs dispatch", variant: "amber" },
  dispatched: { label: "Driver assigned", variant: "blue" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<PortalClinic | null>(null);
  const [queue, setQueue] = useState<SosQueueItem[]>([]);
  const [drivers, setDrivers] = useState<PortalDriver[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError("");
      setLoading(true);
      try {
        const [c, q, d] = await Promise.all([
          fetchPortalClinic(),
          fetchSosQueue(50),
          fetchDrivers(),
        ]);
        if (!cancelled) {
          setClinic(c);
          setQueue(q);
          setDrivers(d);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : "Could not load dashboard data.";
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = useMemo(
    () => queue.filter((i) => i.queueStatus === "pending_dispatch").length,
    [queue],
  );
  const dispatched = useMemo(
    () => queue.filter((i) => i.queueStatus === "dispatched").length,
    [queue],
  );
  const onDuty = useMemo(() => drivers.filter((d) => d.onDuty).length, [drivers]);

  if (!user) return null;

  return (
    <>
      <Header
        title="Operations dashboard"
        subtitle="Live view of your clinic queue, status, and drivers"
        user={user}
      />
      <PageWrapper>
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="SOS in queue"
            value={loading ? "…" : queue.length}
            icon={<Siren className="h-5 w-5" />}
            accent="blue"
          />
          <StatCard
            label="Awaiting dispatch"
            value={loading ? "…" : pending}
            icon={<Activity className="h-5 w-5" />}
            accent="amber"
          />
          <StatCard
            label="Drivers on duty"
            value={loading ? "…" : onDuty}
            icon={<Truck className="h-5 w-5" />}
            accent="green"
          />
          <StatCard
            label="Drivers total"
            value={loading ? "…" : drivers.length}
            icon={<Users className="h-5 w-5" />}
            accent="blue"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Clinic snapshot</CardTitle>
            </CardHeader>
            {clinic ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-brand-border py-2">
                  <span className="text-gray-600">Operational status</span>
                  <Badge variant={clinic.statusIsStale ? "gray" : "green"}>
                    {clinic.statusIsStale ? "Unknown (stale)" : clinic.effectiveStatus}
                  </Badge>
                </div>
                <div className="flex justify-between border-b border-brand-border py-2">
                  <span className="text-gray-600">Ambulance</span>
                  <Badge variant={clinic.ambulanceIsActive ? "green" : "gray"}>
                    {clinic.ambulanceIsActive
                      ? `Available (${clinic.ambulanceCountAvailable ?? 0})`
                      : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between border-b border-brand-border py-2">
                  <span className="text-gray-600">Verified</span>
                  <Badge variant={clinic.verified ? "green" : "amber"}>
                    {clinic.verified ? "Yes" : "Pending"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 pt-1">
                  <Link href="/operational-status" className="text-brand-blue font-medium hover:underline">
                    Operational status
                  </Link>
                  ,{" "}
                  <Link href="/ambulance" className="text-brand-blue font-medium hover:underline">
                    ambulance availability
                  </Link>
                  , and{" "}
                  <Link href="/profile" className="text-brand-blue font-medium hover:underline">
                    facility and map
                  </Link>{" "}
                  are edited on their own pages.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{loading ? "Loading…" : "No clinic data."}</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queue mix</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Needs dispatch</span>
                  <span>{pending}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{
                      width: `${queue.length ? Math.round((pending / queue.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Driver assigned</span>
                  <span>{dispatched}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all"
                    style={{
                      width: `${queue.length ? Math.round((dispatched / queue.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Figures reflect the current SOS queue returned by the API (not historical analytics).
              </p>
            </div>
          </Card>
        </div>

        <Card padding="none">
          <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
            <CardTitle>Current SOS queue</CardTitle>
            <Link href="/sos-queue" className="text-xs text-brand-blue hover:underline font-medium">
              Open queue
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-gray">
                  {["Status", "Patient phone", "When", "Location", "Driver"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 8).map((row) => {
                  const badge = QUEUE_BADGE[row.queueStatus] ?? {
                    label: row.queueStatus,
                    variant: "gray" as const,
                  };
                  return (
                    <tr
                      key={row.sosAttemptId}
                      className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {row.patientPhone ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {formatDate(new Date(row.triggeredAt))}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {row.userLocation.lat != null && row.userLocation.lng != null ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {row.userLocation.lat.toFixed(4)}, {row.userLocation.lng.toFixed(4)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-700">
                        {row.assignment?.driverName || row.assignment?.driverPhone || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && queue.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No active SOS items.</div>
            )}
          </div>
        </Card>
      </PageWrapper>
    </>
  );
}
