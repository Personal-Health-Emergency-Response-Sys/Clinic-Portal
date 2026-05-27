"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Save,
  RefreshCw,
  Gauge,
  Clock,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  Sliders,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { getSession, type AuthSession } from "@/lib/authSession";
import { ApiError } from "@/lib/api";
import { getConfig, updateConfig, type SystemConfig } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

const optimalitySchema = z.object({
  statusWeight:    z.number().min(0).max(1),
  distanceWeight:  z.number().min(0).max(1),
  etaWeight:       z.number().min(0).max(1),
  specialtyWeight: z.number().min(0).max(1),
  historyWeight:   z.number().min(0).max(1),
});

const schema = z.object({
  searchRadiusKm:             z.number().int().min(1).max(200),
  geminiDailyBudgetUSD:       z.number().min(0).max(10_000),
  perUserDailySessionLimit:   z.number().int().min(1).max(1000),
  maxSosAttemptsPerUserPerHr: z.number().int().min(1).max(100),
  maxLoginAttemptsPerWindow:  z.number().int().min(1).max(100),
  loginWindowMin:             z.number().int().min(1).max(1440),
  ambulanceExpiryHours:       z.number().int().min(1).max(72),
  statusExpiryHours:          z.number().int().min(1).max(72),
  assignmentExpiryMin:        z.number().int().min(1).max(180),
  sessionTimeoutMin:          z.number().int().min(1).max(720),
  gpsIntervalSec:             z.number().int().min(1).max(300),
  aiReRankEnabled:            z.boolean(),
  optimalityWeights:          optimalitySchema,
  fallbackEmergencyNumber:    z
    .string()
    .min(2, "Enter at least 2 digits")
    .max(20, "Too long"),
});

type FormValues = z.infer<typeof schema>;

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function configToForm(c: SystemConfig | null): FormValues {
  const fallback: FormValues = {
    searchRadiusKm: 10,
    geminiDailyBudgetUSD: 0,
    perUserDailySessionLimit: 5,
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
      statusWeight: 0.3, distanceWeight: 0.25, etaWeight: 0.2,
      specialtyWeight: 0.15, historyWeight: 0.1,
    },
    fallbackEmergencyNumber: "907",
  };
  if (!c) return fallback;
  return {
    searchRadiusKm:             num(c.searchRadiusKm,             fallback.searchRadiusKm),
    geminiDailyBudgetUSD:       num(c.geminiDailyBudgetUSD,       fallback.geminiDailyBudgetUSD),
    perUserDailySessionLimit:   num(c.perUserDailySessionLimit,   fallback.perUserDailySessionLimit),
    maxSosAttemptsPerUserPerHr: num(c.maxSosAttemptsPerUserPerHr, fallback.maxSosAttemptsPerUserPerHr),
    maxLoginAttemptsPerWindow:  num(c.maxLoginAttemptsPerWindow,  fallback.maxLoginAttemptsPerWindow),
    loginWindowMin:             num(c.loginWindowMin,             fallback.loginWindowMin),
    ambulanceExpiryHours:       num(c.ambulanceExpiryHours,       fallback.ambulanceExpiryHours),
    statusExpiryHours:          num(c.statusExpiryHours,          fallback.statusExpiryHours),
    assignmentExpiryMin:        num(c.assignmentExpiryMin,        fallback.assignmentExpiryMin),
    sessionTimeoutMin:          num(c.sessionTimeoutMin,          fallback.sessionTimeoutMin),
    gpsIntervalSec:             num(c.gpsIntervalSec,             fallback.gpsIntervalSec),
    aiReRankEnabled:            !!c.aiReRankEnabled,
    optimalityWeights: {
      statusWeight:    num(c.optimalityWeights?.statusWeight,    fallback.optimalityWeights.statusWeight),
      distanceWeight:  num(c.optimalityWeights?.distanceWeight,  fallback.optimalityWeights.distanceWeight),
      etaWeight:       num(c.optimalityWeights?.etaWeight,       fallback.optimalityWeights.etaWeight),
      specialtyWeight: num(c.optimalityWeights?.specialtyWeight, fallback.optimalityWeights.specialtyWeight),
      historyWeight:   num(c.optimalityWeights?.historyWeight,   fallback.optimalityWeights.historyWeight),
    },
    fallbackEmergencyNumber: String(c.fallbackEmergencyNumber ?? fallback.fallbackEmergencyNumber),
  };
}

export default function AdminSettingsPage() {
  const [session, setSession]     = useState<AuthSession | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState("");
  const [original, setOriginal]   = useState<SystemConfig | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: configToForm(null),
  });

  useEffect(() => { setSession(getSession()); }, []);

  const hydrate = useCallback((opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setLoadError("");
    getConfig()
      .then((c) => {
        setOriginal(c);
        reset(configToForm(c));
        setLoading(false);
      })
      .catch((e) => {
        setLoadError(e instanceof ApiError ? e.message : "Could not load config.");
        setLoading(false);
      });
  }, [reset]);

  useEffect(() => { hydrate(); }, [hydrate]);

  async function onSubmit(values: FormValues) {
    try {
      const next = await updateConfig(values);
      setOriginal(next);
      reset(configToForm(next));
      toast.success("Configuration saved.");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not save config.";
      toast.error(msg);
    }
  }

  const weights = watch("optimalityWeights");
  const weightSum =
    (weights?.statusWeight ?? 0) +
    (weights?.distanceWeight ?? 0) +
    (weights?.etaWeight ?? 0) +
    (weights?.specialtyWeight ?? 0) +
    (weights?.historyWeight ?? 0);
  const weightSumOK = Math.abs(weightSum - 1) < 0.01;

  const aiReRankEnabled = watch("aiReRankEnabled");

  if (!session) return null;

  const initials = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  return (
    <>
      <Header
        title="System settings"
        subtitle="Global tunables — every save writes an admin.config_update audit log."
        user={headerUser}
      />
      <PageWrapper>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-5xl space-y-5"
        >
          {/* Top action bar */}
          <div className="flex items-center justify-between gap-3 bg-white border border-brand-border rounded-xl px-5 py-3 shadow-sm sticky top-0 z-10">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Edit configuration
              </p>
              <p className="text-xs text-gray-500">
                {loading
                  ? "Loading current values…"
                  : isDirty
                    ? "You have unsaved changes."
                    : "All saved."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => hydrate({ silent: true })}
                disabled={loading || isSubmitting}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Reload
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || loading}
                loading={isSubmitting}
              >
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </div>

          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}

          {/* Dispatch radius + fallback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-brand-blue" />
                Dispatch
              </CardTitle>
            </CardHeader>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumberField
                label="Search radius (km)"
                hint="Maximum distance from the patient to consider a clinic eligible."
                step={1}
                error={errors.searchRadiusKm?.message}
                {...register("searchRadiusKm", { valueAsNumber: true })}
              />
              <TextField
                label="Fallback emergency number"
                hint="Used if no clinic accepts an SOS within the assignment window."
                placeholder="907"
                error={errors.fallbackEmergencyNumber?.message}
                Icon={PhoneCall}
                {...register("fallbackEmergencyNumber")}
              />
            </div>
          </Card>

          {/* Expiry windows */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-blue" />
                Expiry windows
              </CardTitle>
            </CardHeader>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberField
                label="Ambulance expiry (hours)"
                hint="How long an ambulance-available toggle stays valid."
                step={1}
                error={errors.ambulanceExpiryHours?.message}
                {...register("ambulanceExpiryHours", { valueAsNumber: true })}
              />
              <NumberField
                label="Status expiry (hours)"
                hint="Time before an operational status is marked stale."
                step={1}
                error={errors.statusExpiryHours?.message}
                {...register("statusExpiryHours", { valueAsNumber: true })}
              />
              <NumberField
                label="Assignment expiry (min)"
                hint="Driver must accept within this window or the SOS re-queues."
                step={1}
                error={errors.assignmentExpiryMin?.message}
                {...register("assignmentExpiryMin", { valueAsNumber: true })}
              />
              <NumberField
                label="Session timeout (min)"
                hint="Idle dispatch session timeout."
                step={1}
                error={errors.sessionTimeoutMin?.message}
                {...register("sessionTimeoutMin", { valueAsNumber: true })}
              />
              <NumberField
                label="GPS interval (sec)"
                hint="How often the driver app should push location updates."
                step={1}
                error={errors.gpsIntervalSec?.message}
                {...register("gpsIntervalSec", { valueAsNumber: true })}
              />
            </div>
          </Card>

          {/* Rate limits + budgets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-brand-blue" />
                Rate limits &amp; budgets
              </CardTitle>
            </CardHeader>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberField
                label="Per-user daily session limit"
                hint="Max dispatch sessions a single user can start in 24h."
                step={1}
                error={errors.perUserDailySessionLimit?.message}
                {...register("perUserDailySessionLimit", { valueAsNumber: true })}
              />
              <NumberField
                label="Max SOS attempts (per user / hour)"
                step={1}
                error={errors.maxSosAttemptsPerUserPerHr?.message}
                {...register("maxSosAttemptsPerUserPerHr", { valueAsNumber: true })}
              />
              <NumberField
                label="Gemini daily budget (USD)"
                hint="Soft cap for the AI re-ranker. Past this, fallback to deterministic scoring."
                step={0.5}
                error={errors.geminiDailyBudgetUSD?.message}
                {...register("geminiDailyBudgetUSD", { valueAsNumber: true })}
              />
              <NumberField
                label="Max login attempts per window"
                step={1}
                error={errors.maxLoginAttemptsPerWindow?.message}
                {...register("maxLoginAttemptsPerWindow", { valueAsNumber: true })}
              />
              <NumberField
                label="Login window (min)"
                hint="Failed login counter resets after this window."
                step={1}
                error={errors.loginWindowMin?.message}
                {...register("loginWindowMin", { valueAsNumber: true })}
              />
            </div>
          </Card>

          {/* Optimality weights + AI toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-blue" />
                SOS recommendation weights
              </CardTitle>
            </CardHeader>

            <div className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-gray px-4 py-3 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-brand-blue" />
                  AI re-rank enabled
                </p>
                <p className="text-xs text-gray-500">
                  When on, top candidates are re-ordered by Gemini. Off uses
                  pure deterministic scoring.
                </p>
              </div>
              <Toggle
                checked={!!aiReRankEnabled}
                onChange={(v) => setValue("aiReRankEnabled", v, { shouldDirty: true })}
              />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(
                [
                  ["statusWeight",    "Status"],
                  ["distanceWeight",  "Distance"],
                  ["etaWeight",       "ETA"],
                  ["specialtyWeight", "Specialty"],
                  ["historyWeight",   "History"],
                ] as const
              ).map(([key, label]) => (
                <NumberField
                  key={key}
                  label={label}
                  step={0.05}
                  min={0}
                  max={1}
                  error={errors.optimalityWeights?.[key]?.message}
                  {...register(`optimalityWeights.${key}`, { valueAsNumber: true })}
                />
              ))}
            </div>

            <div
              className={cn(
                "mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                weightSumOK
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200",
              )}
            >
              <span>
                Sum of weights:{" "}
                <span className="font-mono font-semibold">
                  {weightSum.toFixed(2)}
                </span>
              </span>
              <span>
                {weightSumOK
                  ? "Balanced ✓"
                  : "Should sum to 1.00 — the backend won't enforce it, but skewed weights distort recommendations."}
              </span>
            </div>
          </Card>

          {original && (
            <p className="text-[11px] text-gray-400">
              Backend config document <code>id=&quot;global&quot;</code>. Unknown
              fields in the patch are ignored server-side.
            </p>
          )}
        </form>
      </PageWrapper>
    </>
  );
}

/* ──────────────────── small inputs ──────────────────── */

interface NumberFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

const NumberField = ({ label, hint, error, ...props }: NumberFieldProps) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type="number"
      inputMode="decimal"
      className={cn(
        "w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900",
        "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue",
        "transition-colors",
        error ? "border-brand-red" : "border-brand-border",
      )}
      {...props}
    />
    {error ? (
      <p className="text-xs text-brand-red">{error}</p>
    ) : hint ? (
      <p className="text-xs text-gray-500">{hint}</p>
    ) : null}
  </div>
);

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  Icon?: React.ComponentType<{ className?: string }>;
}

const TextField = ({ label, hint, error, Icon, ...props }: TextFieldProps) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}
      <input
        type="text"
        className={cn(
          "w-full py-2 text-sm border rounded-lg bg-white text-gray-900",
          "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue",
          "transition-colors",
          Icon ? "pl-9 pr-3" : "px-3",
          error ? "border-brand-red" : "border-brand-border",
        )}
        {...props}
      />
    </div>
    {error ? (
      <p className="text-xs text-brand-red">{error}</p>
    ) : hint ? (
      <p className="text-xs text-gray-500">{hint}</p>
    ) : null}
  </div>
);
