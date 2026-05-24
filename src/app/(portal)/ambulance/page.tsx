"use client";

import { useEffect, useState } from "react";
import { Siren, Clock, AlertTriangle, RefreshCw, Info, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useCountdown } from "@/hooks/useCountdown";
import { formatCountdown } from "@/lib/utils";
import { fetchPortalClinic, updatePortalAmbulance, type PortalClinic } from "@/lib/portalApi";
import { ApiError } from "@/lib/api";

export default function AmbulancePage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<PortalClinic | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countInput, setCountInput] = useState(1);

  const expiry = clinic?.ambulanceExpiry ? new Date(clinic.ambulanceExpiry) : null;
  const remaining = useCountdown(clinic?.ambulanceExpiry);

  async function refresh() {
    setLoadError("");
    setLoading(true);
    try {
      const c = await fetchPortalClinic();
      setClinic(c);
      setCountInput(Math.max(1, c.ambulanceCountAvailable || 1));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load ambulance status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, []);

  const available = !!clinic?.ambulanceAvailable;
  const active = !!clinic?.ambulanceIsActive;

  async function persist(nextAvailable: boolean, count?: number) {
    setSaving(true);
    try {
      const updated = await updatePortalAmbulance(
        nextAvailable,
        nextAvailable ? count ?? Math.max(1, countInput) : undefined,
      );
      setClinic(updated);
      setCountInput(Math.max(1, updated.ambulanceCountAvailable || 1));
      toast.success("Ambulance availability updated.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const isWarning =
    active && remaining.totalMs > 0 && remaining.totalMs < 30 * 60 * 1000;

  return (
    <>
      <Header
        title="Ambulance availability"
        subtitle="Matches PUT /portal/clinic/ambulance on the PersonalHERS API"
        user={user}
      />
      <PageWrapper>
        <div className="max-w-2xl space-y-5">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}

          <Card>
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-2xl ${active ? "bg-green-50" : "bg-gray-100"}`}>
                <Siren className={`h-8 w-8 ${active ? "text-brand-green" : "text-gray-400"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Ambulance service</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When active and not expired, your clinic is eligible for ambulance-weighted SOS routing.
                    </p>
                  </div>
                  <Toggle
                    checked={available}
                    onChange={(v) => void persist(v, countInput)}
                    size="md"
                    disabled={loading || saving}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge variant={active ? "green" : "gray"}>
                    {active ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Live window
                      </>
                    ) : available ? (
                      "Waiting for refresh"
                    ) : (
                      "Unavailable"
                    )}
                  </Badge>
                  {available && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Ambulances</span>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        className="w-20 py-1"
                        value={countInput}
                        onChange={(e) => setCountInput(Number(e.target.value) || 1)}
                        disabled={saving}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        loading={saving}
                        onClick={() => void persist(true, countInput)}
                      >
                        Apply count
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {available && expiry && (
            <Card className={isWarning ? "border-amber-300 bg-amber-50" : ""}>
              <CardHeader>
                <CardTitle>Expiry timer</CardTitle>
                <Clock className={`h-4 w-4 ${isWarning ? "text-amber-500" : "text-gray-400"}`} />
              </CardHeader>

              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-2">Time remaining on the current availability window</p>
                <p
                  className={`text-5xl font-bold font-mono tracking-tight ${
                    isWarning ? "text-amber-600" : "text-gray-900"
                  }`}
                >
                  {formatCountdown(remaining.hours, remaining.minutes, remaining.seconds)}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Window ends {expiry.toLocaleString("en-ET", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>

              {isWarning && (
                <div className="flex items-center gap-2 p-3 bg-amber-100 border border-amber-300 rounded-lg mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    Availability is about to expire. Reconfirm to extend the window using your system policy.
                  </p>
                </div>
              )}

              <Button onClick={() => void persist(true, countInput)} className="w-full" loading={saving}>
                <RefreshCw className="h-4 w-4" />
                Reconfirm availability
              </Button>
            </Card>
          )}

          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-brand-blue flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1.5">
                <p>
                  <strong>Server rules:</strong> turning availability on sets both count and expiry according to the
                  global <code className="text-xs bg-white/60 px-1 rounded">SystemConfig</code> on the backend. Turning
                  it off clears the expiry immediately.
                </p>
                <p className="text-xs text-blue-700">
                  Detailed audit history is available to system administrators via the admin event log API.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </PageWrapper>
    </>
  );
}
