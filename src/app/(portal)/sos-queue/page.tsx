"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Phone, MapPin, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import { fetchSosQueue, fetchDrivers, type SosQueueItem, type PortalDriver } from "@/lib/portalApi";
import { assignSosAttempt, dismissSosAttempt } from "@/lib/sosApi";
import { ApiError } from "@/lib/api";

const QUEUE_BADGE: Record<string, { label: string; variant: "amber" | "blue" | "gray" }> = {
  pending_dispatch: { label: "Needs dispatch", variant: "amber" },
  dispatched: { label: "Driver assigned", variant: "blue" },
};

const dismissSchema = z.object({
  reason: z.string().min(3, "At least 3 characters").max(500),
});

type DismissForm = z.infer<typeof dismissSchema>;

export default function SosQueuePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<SosQueueItem[]>([]);
  const [drivers, setDrivers] = useState<PortalDriver[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [driverPick, setDriverPick] = useState<Record<string, string>>({});

  const dismissForm = useForm<DismissForm>({
    resolver: zodResolver(dismissSchema),
    defaultValues: { reason: "" },
  });

  const load = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const [q, d] = await Promise.all([fetchSosQueue(100), fetchDrivers()]);
      setQueue(q);
      setDrivers(d);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load SOS queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function onAssign(sosAttemptId: string) {
    const driverId = driverPick[sosAttemptId];
    if (!driverId) {
      toast.error("Choose a driver first.");
      return;
    }
    setAssigning(sosAttemptId);
    try {
      await assignSosAttempt(sosAttemptId, driverId);
      toast.success("Driver notified — assignment is pending acceptance.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Assign failed.");
    } finally {
      setAssigning(null);
    }
  }

  async function onDismissSubmit(data: DismissForm) {
    if (!dismissId) return;
    try {
      await dismissSosAttempt(dismissId, data.reason);
      toast.success("SOS attempt dismissed.");
      setDismissId(null);
      dismissForm.reset({ reason: "" });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Dismiss failed.");
    }
  }

  if (!user) return null;

  return (
    <>
      <Header
        title="SOS queue"
        subtitle="Live queue from GET /portal/sos-queue — dispatch uses POST /sos/:id/assign"
        user={user}
      />
      <PageWrapper>
        <div className="space-y-5">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}

          <Card padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                {loading ? "Loading…" : `${queue.length} item(s) in pending or dispatched state.`}
              </p>
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </Card>

          <Card padding="none">
            <div className="px-6 py-4 border-b border-brand-border">
              <CardTitle>Queue</CardTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-brand-gray">
                    {["Status", "Patient", "When", "Location", "Dispatch", "Actions"].map((h) => (
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
                  {queue.map((row) => {
                    const badge = QUEUE_BADGE[row.queueStatus] ?? {
                      label: row.queueStatus,
                      variant: "gray" as const,
                    };
                    return (
                      <tr
                        key={row.sosAttemptId}
                        className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors"
                      >
                        <td className="px-6 py-3 align-top">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 align-top">
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {row.patientPhone ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500 align-top">
                          {formatDate(new Date(row.triggeredAt))}
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {row.elapsedSeconds}s since trigger
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500 align-top">
                          {row.userLocation.lat != null && row.userLocation.lng != null ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {row.userLocation.lat.toFixed(4)}, {row.userLocation.lng.toFixed(4)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs align-top min-w-[200px]">
                          {row.queueStatus === "pending_dispatch" && (
                            <div className="space-y-2">
                              <select
                                className="w-full text-xs border border-brand-border rounded-lg px-2 py-2 bg-white"
                                value={driverPick[row.sosAttemptId] ?? ""}
                                onChange={(e) =>
                                  setDriverPick((p) => ({ ...p, [row.sosAttemptId]: e.target.value }))
                                }
                              >
                                <option value="">Select driver…</option>
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.firstName || "Driver"} · {d.phone}
                                    {d.onDuty ? " · on duty" : ""}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                loading={assigning === row.sosAttemptId}
                                onClick={() => void onAssign(row.sosAttemptId)}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Assign
                              </Button>
                            </div>
                          )}
                          {row.queueStatus === "dispatched" && row.assignment && (
                            <div className="space-y-1 text-gray-700">
                              <p className="font-medium">
                                {row.assignment.driverName || row.assignment.driverPhone || "Driver"}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                Accept window: {row.assignment.secondsLeft}s left
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 align-top">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-brand-red border-red-200 hover:bg-red-50"
                            onClick={() => {
                              setDismissId(row.sosAttemptId);
                              dismissForm.reset({ reason: "" });
                            }}
                          >
                            Dismiss
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && queue.length === 0 && (
                <div className="text-center py-14 text-gray-400 text-sm">No items in the SOS queue.</div>
              )}
            </div>
          </Card>
        </div>

        <Modal
          open={!!dismissId}
          onClose={() => {
            setDismissId(null);
            dismissForm.reset({ reason: "" });
          }}
          title="Dismiss SOS attempt"
        >
          <form onSubmit={dismissForm.handleSubmit(onDismissSubmit)} className="space-y-4">
            <p className="text-xs text-gray-500">
              This calls <code className="bg-gray-100 px-1 rounded">POST /api/v1/sos/:id/dismiss</code> with an audit
              reason (3–500 characters).
            </p>
            <Input
              label="Reason"
              placeholder="Describe why this attempt is dismissed"
              error={dismissForm.formState.errors.reason?.message}
              {...dismissForm.register("reason")}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1" loading={dismissForm.formState.isSubmitting}>
                Confirm dismiss
              </Button>
              <Button type="button" variant="outline" onClick={() => setDismissId(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </PageWrapper>
    </>
  );
}
