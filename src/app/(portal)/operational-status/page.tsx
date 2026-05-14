"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { OPERATIONAL_STATUS_ENUM, OPERATIONAL_STATUSES } from "@/lib/constants";
import { fetchPortalClinic, updatePortalStatus } from "@/lib/portalApi";
import type { PortalClinic } from "@/lib/portalApi";
import { ApiError } from "@/lib/api";

const statusSchema = z.object({
  status: z.enum(OPERATIONAL_STATUS_ENUM),
  note: z.string().max(500).optional(),
});

type StatusForm = z.infer<typeof statusSchema>;

/** Maps to `GET/PUT /api/v1/portal/clinic/status` (status only; facility is under /profile). */
export default function OperationalStatusPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<PortalClinic | null>(null);
  const [loadError, setLoadError] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);

  const statusForm = useForm<StatusForm>({
    resolver: zodResolver(statusSchema) as Resolver<StatusForm>,
    defaultValues: { status: "Available", note: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError("");
      try {
        const c = await fetchPortalClinic();
        if (cancelled) return;
        setClinic(c);
        statusForm.reset({
          status: (c.operationalStatus as StatusForm["status"]) ?? "Available",
          note: "",
        });
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : "Could not load clinic.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusForm]);

  async function onStatusSubmit(data: StatusForm) {
    setStatusSaved(false);
    try {
      const updated = await updatePortalStatus(data.status, data.note);
      setClinic(updated);
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2500);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not update status.");
    }
  }

  if (!user) return null;

  return (
    <>
      <Header
        title="Operational status"
        subtitle="PUT /api/v1/portal/clinic/status — how patients see your capacity"
        user={user}
      />
      <PageWrapper>
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="max-w-3xl space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Current visibility</CardTitle>
              {clinic?.statusIsStale ? (
                <Badge variant="gray">Stale — save an update to refresh</Badge>
              ) : (
                <Badge variant="blue">Effective: {clinic?.effectiveStatus ?? "—"}</Badge>
              )}
            </CardHeader>
            <p className="text-xs text-gray-500 mb-3">
              Staff and operators can both update this. Facility name, phones, and ambulance are managed on
              their own pages.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-brand-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  {...statusForm.register("status")}
                >
                  {OPERATIONAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Internal note (optional)"
                placeholder="Shown in audit logs only"
                {...statusForm.register("note")}
              />
            </div>
          </Card>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={statusForm.formState.isSubmitting} size="lg">
              Save operational status
            </Button>
            {statusSaved && (
              <span className="text-sm text-brand-green font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </PageWrapper>
    </>
  );
}
