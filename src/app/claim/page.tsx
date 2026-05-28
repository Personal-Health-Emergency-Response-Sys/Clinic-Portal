// src/app/claim/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSignature,
  FileText,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ETHIOPIAN_PHONE_REGEX } from "@/lib/constants";
import {
  CLAIM_FILE_ACCEPT_ATTR,
  CLAIM_FILE_ACCEPT_MIME,
  CLAIM_FILE_MAX_BYTES,
  CLINIC_SEARCH_MIN_CHARS,
  fetchClaimableClinics,
  submitClinicClaim,
  type ClaimableClinic,
  type ClaimSubmissionResult,
} from "@/lib/claimApi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ────────────── schema ────────────── */

const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

const schema = z
  .object({
    phone: z
      .string()
      .min(1, "Phone is required")
      .regex(
        ETHIOPIAN_PHONE_REGEX,
        "Use Ethiopian format +2519XXXXXXXX or +2517XXXXXXXX",
      ),
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name must be 80 characters or fewer"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or fewer"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    clinicId: z
      .string()
      .trim()
      .regex(
        MONGO_OBJECT_ID,
        "Clinic ID must be a 24-character hexadecimal identifier",
      ),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormData = z.infer<typeof schema>;

/* ────────────── step config ────────────── */

const STEPS = [
  { id: 1, title: "About you", icon: User },
  { id: 2, title: "Your clinic", icon: Building2 },
  { id: 3, title: "Documents", icon: FileText },
  { id: 4, title: "Review", icon: ShieldCheck },
] as const;

type StepNumber = (typeof STEPS)[number]["id"];

const STEP_FIELDS: Record<StepNumber, (keyof FormData)[]> = {
  1: ["fullName", "phone", "password", "confirmPassword"],
  2: [], // clinic selection is handled manually — see goNext()
  3: [],
  4: [],
};

/* ────────────── page ────────────── */

export default function ClaimPage() {
  const [step, setStep] = useState<StepNumber>(1);
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [medicalCert, setMedicalCert] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<{
    businessLicense?: string;
    medicalCert?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimSubmissionResult | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [clinics, setClinics] = useState<ClaimableClinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [clinicsError, setClinicsError] = useState<string>("");
  const [clinicQuery, setClinicQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<ClaimableClinic | null>(
    null,
  );
  const [clinicPickerError, setClinicPickerError] = useState<string>("");

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      phone: "",
      fullName: "",
      password: "",
      confirmPassword: "",
      clinicId: "",
    },
  });

  // Debounced server-side search. Fires only when the user has typed
  // CLINIC_SEARCH_MIN_CHARS or more; cancels in-flight requests on every
  // new keystroke so stale results never overwrite fresh ones.
  //
  // setStates only happen inside the timer/promise callbacks (i.e.
  // asynchronously), never in the effect body itself — the rendered
  // listing is derived from the query at render time so that "below
  // threshold" states don't need to write back into state.
  useEffect(() => {
    const q = clinicQuery.trim();
    if (q.length < CLINIC_SEARCH_MIN_CHARS) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setClinicsLoading(true);
      setClinicsError("");
      fetchClaimableClinics(q, { signal: controller.signal })
        .then((data) => {
          setClinics(data);
          setClinicsLoading(false);
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setClinicsError(
            e instanceof ApiError
              ? e.message
              : "Couldn't search clinics. Try again in a moment.",
          );
          setClinicsLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clinicQuery]);

  // Derived display state: when the query is below the search threshold,
  // hide any stale results from a previous search without touching state.
  const querySearchable =
    clinicQuery.trim().length >= CLINIC_SEARCH_MIN_CHARS;
  const displayClinics = querySearchable ? clinics : [];
  const displayLoading = querySearchable && clinicsLoading;
  const displayError = querySearchable ? clinicsError : "";

  function pickClinic(c: ClaimableClinic) {
    setSelectedClinic(c);
    setValue("clinicId", c.id, { shouldValidate: true });
    setClinicPickerError("");
  }

  function validateFiles(): boolean {
    const next: typeof fileErrors = {};
    if (!businessLicense) next.businessLicense = "Business license is required";
    if (!medicalCert) next.medicalCert = "Medical certificate is required";
    setFileErrors(next);
    return Object.keys(next).length === 0;
  }

  async function goNext() {
    setSubmitError("");
    const fields = STEP_FIELDS[step];
    if (fields.length) {
      const ok = await trigger(fields, { shouldFocus: true });
      if (!ok) return;
    }
    if (step === 2) {
      if (!selectedClinic) {
        setClinicPickerError("Please select your clinic to continue.");
        return;
      }
      setClinicPickerError("");
    }
    if (step === 3 && !validateFiles()) return;
    setStep((s) => (Math.min(4, s + 1) as StepNumber));
  }

  function goBack() {
    setSubmitError("");
    setStep((s) => (Math.max(1, s - 1) as StepNumber));
  }

  async function onSubmit(data: FormData) {
    setSubmitError("");
    if (!selectedClinic) {
      setClinicPickerError("Please select your clinic to continue.");
      setStep(2);
      return;
    }
    if (!validateFiles() || !businessLicense || !medicalCert) {
      setStep(3);
      return;
    }
    setSubmitting(true);
    try {
      const out = await submitClinicClaim({
        phone: data.phone,
        fullName: data.fullName,
        password: data.password,
        clinicId: data.clinicId,
        businessLicense,
        medicalCert,
      });
      setResult(out);
      toast.success("Claim submitted — check your phone for an SMS.");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Could not submit your claim. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ClaimSuccess result={result} phone={getValues("phone")} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <Stepper current={step} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden"
      >
        <div className="px-6 sm:px-8 py-7">
          {step === 1 && (
            <Step1
              register={register}
              errors={errors}
              showPw={showPw}
              togglePw={() => setShowPw((v) => !v)}
            />
          )}
          {step === 2 && (
            <Step2
              clinics={displayClinics}
              loading={displayLoading}
              loadError={displayError}
              query={clinicQuery}
              setQuery={setClinicQuery}
              selected={selectedClinic}
              onSelect={pickClinic}
              onClearSelection={() => {
                setSelectedClinic(null);
                setValue("clinicId", "", { shouldValidate: false });
              }}
              pickerError={clinicPickerError}
            />
          )}
          {step === 3 && (
            <Step3
              businessLicense={businessLicense}
              medicalCert={medicalCert}
              setBusinessLicense={(f) => {
                setBusinessLicense(f);
                setFileErrors((p) => ({ ...p, businessLicense: undefined }));
              }}
              setMedicalCert={(f) => {
                setMedicalCert(f);
                setFileErrors((p) => ({ ...p, medicalCert: undefined }));
              }}
              errors={fileErrors}
            />
          )}
          {step === 4 && (
            <Step4
              values={getValues()}
              clinic={selectedClinic}
              businessLicense={businessLicense}
              medicalCert={medicalCert}
            />
          )}

          {submitError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-brand-red">
              {submitError}
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 py-4 bg-brand-gray border-t border-brand-border flex items-center justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          )}

          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" loading={submitting} size="lg">
              <FileSignature className="h-4 w-4" />
              Submit claim
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-brand-blue" />
        Your password is hashed before storage. Documents are encrypted in
        transit and at rest.
      </p>
    </div>
  );
}

/* ────────────── stepper ────────────── */

function Stepper({ current }: { current: StepNumber }) {
  return (
    <div className="hidden sm:block">
      <ol className="grid grid-cols-4 gap-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const state =
            s.id < current ? "done" : s.id === current ? "active" : "todo";
          return (
            <li key={s.id} className="flex flex-col items-center text-center">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                  state === "done" &&
                    "bg-brand-blue border-brand-blue text-white",
                  state === "active" &&
                    "bg-white border-brand-blue text-brand-blue shadow-sm",
                  state === "todo" &&
                    "bg-white border-brand-border text-gray-400",
                )}
              >
                {state === "done" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-[18px] w-[18px]" />
                )}
              </div>
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  state === "active"
                    ? "text-brand-navy"
                    : state === "done"
                      ? "text-brand-blue"
                      : "text-gray-400",
                )}
              >
                Step {s.id}
              </p>
              <p
                className={cn(
                  "text-[11px]",
                  state === "todo" ? "text-gray-400" : "text-gray-600",
                )}
              >
                {s.title}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ────────────── steps ────────────── */

function Step1({
  register,
  errors,
  showPw,
  togglePw,
}: {
  register: ReturnType<typeof useForm<FormData>>["register"];
  errors: ReturnType<typeof useForm<FormData>>["formState"]["errors"];
  showPw: boolean;
  togglePw: () => void;
}) {
  return (
    <div>
      <SectionHeading
        icon={User}
        eyebrow="Step 1 of 4"
        title="Tell us about you"
        body="You'll become this clinic's first administrator once the claim is approved. The phone number and password below are how you'll sign in."
      />

      <div className="mt-6 space-y-4">
        <Input
          label="Full name"
          placeholder="Abebe Bekele"
          hint="Shown to the reviewing administrator. 2–80 characters."
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <Input
          label="Phone number"
          type="tel"
          placeholder="+251911234567"
          hint="Ethiopian mobile, including country code. Approval SMS goes here."
          error={errors.phone?.message}
          {...register("phone")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="At least 8 characters"
                className={cn(
                  "w-full px-3 py-2 pr-10 text-sm border rounded-lg bg-white text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue",
                  errors.password ? "border-brand-red" : "border-brand-border",
                )}
                {...register("password")}
              />
              <button
                type="button"
                onClick={togglePw}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-brand-red">
                {errors.password.message}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                You&apos;ll sign in to the portal with this password.
              </p>
            )}
          </div>

          <Input
            label="Confirm password"
            type={showPw ? "text" : "password"}
            placeholder="Re-enter password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>
      </div>
    </div>
  );
}

function Step2({
  clinics,
  loading,
  loadError,
  query,
  setQuery,
  selected,
  onSelect,
  onClearSelection,
  pickerError,
}: {
  clinics: ClaimableClinic[];
  loading: boolean;
  loadError: string;
  query: string;
  setQuery: (q: string) => void;
  selected: ClaimableClinic | null;
  onSelect: (c: ClaimableClinic) => void;
  onClearSelection: () => void;
  pickerError: string;
}) {
  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < CLINIC_SEARCH_MIN_CHARS;
  const idle = trimmed.length === 0;
  const hasResults = !loading && !loadError && clinics.length > 0;
  const showEmpty =
    !loading &&
    !loadError &&
    trimmed.length >= CLINIC_SEARCH_MIN_CHARS &&
    clinics.length === 0;

  return (
    <div>
      <SectionHeading
        icon={Building2}
        eyebrow="Step 2 of 4"
        title="Which clinic are you claiming?"
        body="SmartHERS only accepts claims for facilities in the Ministry of Health registry. Start typing your clinic's name — only clinics that haven't been claimed yet are searchable."
      />

      {selected && (
        <SelectedClinicCard clinic={selected} onClear={onClearSelection} />
      )}

      <div className="mt-6">
        <label
          htmlFor="clinic-search"
          className="text-sm font-medium text-gray-700"
        >
          {selected ? "Search again to change selection" : "Search the registry"}
        </label>
        <div className="mt-1.5 relative">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="clinic-search"
            type="text"
            value={query}
            autoComplete="off"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            placeholder="e.g. Tikur, Hayat, St. Paul"
            className="w-full pl-9 pr-10 py-2.5 text-sm border border-brand-border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 text-brand-blue animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          ) : (
            query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        <p className="mt-2 text-[11px] text-gray-500">
          {loading
            ? `Searching for "${trimmed}"…`
            : loadError
              ? "Search failed — adjust your query and try again."
              : tooShort
                ? `Type at least ${CLINIC_SEARCH_MIN_CHARS} characters to search.`
                : idle
                  ? `We search by clinic name. Match starts as soon as you type ${CLINIC_SEARCH_MIN_CHARS} characters.`
                  : `${clinics.length} ${clinics.length === 1 ? "match" : "matches"} for "${trimmed}"`}
        </p>

        <div className="mt-3 space-y-2">
          {idle && !selected && <ClinicSearchHint />}

          {loading && <ClinicListSkeleton />}

          {!loading && loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
              <p className="text-sm font-medium text-red-700">
                Couldn&apos;t reach the clinic registry.
              </p>
              <p className="text-xs text-red-600 mt-1">{loadError}</p>
            </div>
          )}

          {showEmpty && <ClinicNoMatchState query={trimmed} />}

          {hasResults && (
            <div className="max-h-[380px] overflow-y-auto pr-1 -mr-1 space-y-2">
              {clinics.map((c) => (
                <ClinicOption
                  key={c.id}
                  clinic={c}
                  selected={selected?.id === c.id}
                  onSelect={() => onSelect(c)}
                  query={trimmed}
                />
              ))}
            </div>
          )}
        </div>

        {pickerError && (
          <p className="mt-3 text-xs text-brand-red">{pickerError}</p>
        )}

        <div className="mt-5 rounded-xl bg-brand-blue/5 border border-brand-blue/20 p-4 flex gap-3">
          <Stethoscope className="h-5 w-5 text-brand-blue flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium text-brand-navy">
              Can&apos;t find your clinic?
            </p>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              Only clinics in the MoH registry appear here. Email{" "}
              <a
                href="mailto:onboarding@smart-hers.com"
                className="text-brand-blue hover:underline"
              >
                onboarding@smart-hers.com
              </a>{" "}
              with your facility name and region to get added — we usually
              respond within one business day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedClinicCard({
  clinic,
  onClear,
}: {
  clinic: ClaimableClinic;
  onClear: () => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-brand-green/40 bg-brand-green/5 p-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="inline-flex h-9 w-9 rounded-lg bg-brand-green/15 items-center justify-center text-brand-green flex-shrink-0">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-green">
            Selected clinic
          </p>
          <p className="text-sm font-semibold text-brand-navy truncate">
            {clinic.name}
          </p>
          {clinic.subSpecialty && (
            <p className="text-[11px] text-gray-500 truncate">
              {clinic.subSpecialty}
            </p>
          )}
          {clinic.address && (
            <p className="text-xs text-gray-600 truncate mt-0.5">
              {clinic.address}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-red transition-colors flex-shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Change
      </button>
    </div>
  );
}

function ClinicSearchHint() {
  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-brand-gray px-4 py-8 text-center">
      <Search className="h-8 w-8 text-gray-400 mx-auto" />
      <p className="mt-3 text-sm font-medium text-brand-navy">
        Start typing your clinic&apos;s name
      </p>
      <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
        Results appear as you type. Try the first few letters — for example,
        type <span className="font-mono text-brand-navy">tikur</span> to find{" "}
        <span className="text-brand-navy">Tikur Anbessa Specialized Hospital</span>.
      </p>
    </div>
  );
}

function ClinicNoMatchState({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-brand-gray px-4 py-8 text-center">
      <Building2 className="h-8 w-8 text-gray-400 mx-auto" />
      <p className="mt-3 text-sm font-medium text-brand-navy">
        No clinics match &ldquo;{query}&rdquo;
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Try fewer letters, check the spelling, or ask onboarding to add your
        facility to the registry.
      </p>
    </div>
  );
}

function ClinicOption({
  clinic,
  selected,
  onSelect,
  query,
}: {
  clinic: ClaimableClinic;
  selected: boolean;
  onSelect: () => void;
  query: string;
}) {
  const typeTone =
    clinic.type === "hospital"
      ? "bg-brand-navy/10 text-brand-navy border-brand-navy/15"
      : "bg-brand-blue/10 text-brand-blue border-brand-blue/15";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full text-left rounded-xl border bg-white p-4 transition-all flex items-start gap-3",
        selected
          ? "border-brand-blue ring-2 ring-brand-blue/20 shadow-sm"
          : "border-brand-border hover:border-brand-blue/50 hover:shadow-sm",
      )}
    >
      <div
        className={cn(
          "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          selected
            ? "bg-brand-blue border-brand-blue text-white"
            : "border-brand-border bg-white",
        )}
      >
        {selected && <CheckCircle2 className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-brand-navy leading-snug">
            <HighlightedText text={clinic.name} query={query} />
          </p>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
              typeTone,
            )}
          >
            {clinic.type}
          </span>
        </div>

        {clinic.subSpecialty && (
          <p className="mt-0.5 text-[11px] text-gray-500">
            {clinic.subSpecialty}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {clinic.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {clinic.address}
            </span>
          )}
          {clinic.specialty && clinic.specialty !== "general" && (
            <span className="capitalize">· {clinic.specialty.replace(/_/g, " ")}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function ClinicListSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-brand-border bg-white p-4 flex items-start gap-3 animate-pulse"
        >
          <div className="h-5 w-5 rounded-full bg-brand-gray flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 bg-brand-gray rounded" />
            <div className="h-2.5 w-1/3 bg-brand-gray rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + needle.length);
  const after = text.slice(idx + needle.length);
  return (
    <>
      {before}
      <span className="bg-brand-blue/15 text-brand-blue rounded px-0.5">
        {match}
      </span>
      {after}
    </>
  );
}

function Step3({
  businessLicense,
  medicalCert,
  setBusinessLicense,
  setMedicalCert,
  errors,
}: {
  businessLicense: File | null;
  medicalCert: File | null;
  setBusinessLicense: (f: File | null) => void;
  setMedicalCert: (f: File | null) => void;
  errors: { businessLicense?: string; medicalCert?: string };
}) {
  return (
    <div>
      <SectionHeading
        icon={FileText}
        eyebrow="Step 3 of 4"
        title="Upload your documents"
        body="We need both to verify your clinic. Files are private and only visible to the reviewing system administrator."
      />

      <div className="mt-6 space-y-4">
        <FileDrop
          label="Business license"
          description="A scan or photo of your trade licence or operating certificate."
          file={businessLicense}
          onChange={setBusinessLicense}
          error={errors.businessLicense}
        />
        <FileDrop
          label="Medical certificate"
          description="Your facility's medical practice certificate or equivalent permit."
          file={medicalCert}
          onChange={setMedicalCert}
          error={errors.medicalCert}
        />
      </div>

      <p className="mt-5 text-[11px] text-gray-500">
        Accepted formats: JPG, PNG, WEBP, or PDF. Each file up to 10 MB.
      </p>
    </div>
  );
}

function Step4({
  values,
  clinic,
  businessLicense,
  medicalCert,
}: {
  values: FormData;
  clinic: ClaimableClinic | null;
  businessLicense: File | null;
  medicalCert: File | null;
}) {
  return (
    <div>
      <SectionHeading
        icon={ShieldCheck}
        eyebrow="Step 4 of 4"
        title="Review and submit"
        body="Take a moment to confirm everything looks right. After submission you can't edit a claim — you'd have to wait for a decision and re-apply."
      />

      {clinic && (
        <div className="mt-6 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white border border-brand-blue/30 flex items-center justify-center text-brand-blue flex-shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-blue">
              Claiming
            </p>
            <p className="mt-0.5 text-base font-semibold text-brand-navy">
              {clinic.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="capitalize font-medium">{clinic.type}</span>
              {clinic.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {clinic.address}
                </span>
              )}
            </div>
            <p className="mt-2 text-[10px] font-mono text-gray-400 break-all">
              {clinic.id}
            </p>
          </div>
        </div>
      )}

      <dl className="mt-6 grid sm:grid-cols-2 gap-4">
        <ReviewRow label="Full name" value={values.fullName} />
        <ReviewRow label="Phone number" value={values.phone} />
        <ReviewRow label="Password" value="••••••••" />
        <ReviewRow
          label="Business license"
          value={businessLicense ? fileSummary(businessLicense) : "—"}
        />
        <ReviewRow
          label="Medical certificate"
          value={medicalCert ? fileSummary(medicalCert) : "—"}
        />
      </dl>

      <div className="mt-6 rounded-xl bg-brand-gray border border-brand-border p-4 flex gap-3">
        <MessageSquare className="h-5 w-5 text-brand-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-medium text-brand-navy">What happens next</p>
          <ul className="mt-1 text-xs text-gray-600 leading-relaxed space-y-1 list-disc list-inside">
            <li>You&apos;ll get an SMS confirming we received your claim.</li>
            <li>
              A SmartHERS administrator reviews your documents (~1 business
              day).
            </li>
            <li>
              On approval, sign in with this phone and the password you just
              set.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ────────────── success ────────────── */

function ClaimSuccess({
  result,
  phone,
}: {
  result: ClaimSubmissionResult;
  phone: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-brand-green/15 to-brand-blue/10 px-6 sm:px-10 py-10 text-center border-b border-brand-border">
          <div className="mx-auto h-16 w-16 rounded-full bg-brand-green/15 border border-brand-green/30 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-brand-green" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-brand-navy">
            Claim submitted
          </h1>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            We sent a confirmation SMS to{" "}
            <span className="font-medium text-brand-navy">{phone}</span>. A
            system administrator will review your documents shortly.
          </p>
        </div>

        <div className="px-6 sm:px-10 py-8 space-y-5">
          <ReviewRow label="Claim reference" value={result.claimId} mono />
          <ReviewRow
            label="Clinic identifier"
            value={result.clinicId}
            mono
          />
          <ReviewRow label="Status" value="Pending review" />
          <ReviewRow
            label="Submitted at"
            value={new Date(result.submittedAt).toLocaleString()}
          />

          <div className="pt-2 rounded-xl bg-brand-blue/5 border border-brand-blue/20 p-4">
            <p className="text-sm font-medium text-brand-navy">
              While you wait
            </p>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              Keep your phone reachable — approvals, rejections, and any
              requests for re-upload arrive by SMS. Once approved, sign in at
              the portal with the password you set during this claim.
            </p>
          </div>
        </div>

        <div className="px-6 sm:px-10 py-5 bg-brand-gray border-t border-brand-border flex flex-col sm:flex-row gap-3 justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-sky transition-colors"
          >
            Sign in to the portal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ────────────── shared bits ────────────── */

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue flex-shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">{title}</h2>
        <p className="mt-1 text-sm text-gray-600 max-w-xl">{body}</p>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm text-brand-navy font-medium break-words",
          mono && "font-mono text-xs",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function FileDrop({
  label,
  description,
  file,
  onChange,
  error,
}: {
  label: string;
  description: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [dragOver, setDragOver] = useState(false);

  const shownError = error || localError;

  function handleFile(f: File | null | undefined) {
    setLocalError(undefined);
    if (!f) {
      onChange(null);
      return;
    }
    if (!CLAIM_FILE_ACCEPT_MIME.includes(f.type as never)) {
      setLocalError("File must be JPG, PNG, WEBP, or PDF.");
      return;
    }
    if (f.size > CLAIM_FILE_MAX_BYTES) {
      setLocalError("File is larger than 10 MB.");
      return;
    }
    onChange(f);
  }

  const summary = useMemo(() => (file ? fileSummary(file) : null), [file]);

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>

      {file ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-brand-green/40 bg-brand-green/5 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 rounded-lg bg-brand-green/15 items-center justify-center text-brand-green">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-navy truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">{summary}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-red transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-2 flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center",
            dragOver
              ? "border-brand-blue bg-brand-blue/5"
              : shownError
                ? "border-brand-red/40 bg-red-50/40"
                : "border-brand-border bg-brand-gray hover:border-brand-blue/40 hover:bg-brand-blue/5",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={CLAIM_FILE_ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-brand-border text-brand-blue">
            <Upload className="h-4 w-4" />
          </span>
          <p className="text-sm text-brand-navy font-medium">
            Click to upload or drag and drop
          </p>
          <p className="text-[11px] text-gray-500">
            JPG, PNG, WEBP, or PDF · up to 10 MB
          </p>
        </label>
      )}

      {shownError && (
        <p className="mt-1.5 text-xs text-brand-red">{shownError}</p>
      )}
    </div>
  );
}

function fileSummary(file: File): string {
  const kb = file.size / 1024;
  const sizeLabel =
    kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.ceil(kb)} KB`;
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  return `${ext} · ${sizeLabel}`;
}
