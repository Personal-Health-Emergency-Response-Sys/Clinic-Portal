"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Upload,
  FileJson,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  PlayCircle,
  Trash2,
  Hash,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getSession, type AuthSession } from "@/lib/authSession";
import { ApiError } from "@/lib/api";
import {
  applyImport,
  cancelImport,
  getImportJob,
  startMohImport,
  updateImportResolutions,
  type ApplyResult,
  type ImportDiffRecord,
  type ImportJob,
  type ImportResolution,
  type MohRecord,
} from "@/lib/adminApi";
import { cn } from "@/lib/utils";

type Step = "compose" | "review" | "done";

const SAMPLE_BATCH = `{
  "sourceTag": "sample-batch-2026-05",
  "sourceType": "json",
  "records": [
    {
      "mohRegistryId": "sample-001",
      "name": "Sample Test Hospital",
      "type": "hospital",
      "specialty": "general",
      "address": "Sample address, Addis Ababa",
      "phones": [{ "number": "+251911000000", "priority": 1, "label": "main" }],
      "location": { "type": "Point", "coordinates": [38.7613, 9.0107] }
    },
    {
      "mohRegistryId": "sample-002",
      "name": "Sample Pediatric Clinic",
      "type": "clinic",
      "specialty": "pediatrics",
      "phones": [{ "number": "+251911000001", "priority": 1, "label": "main" }],
      "location": { "type": "Point", "coordinates": [38.7595, 9.0124] }
    }
  ]
}`;

export default function AdminMohImportPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [step, setStep] = useState<Step>("compose");

  // Compose step
  const [raw, setRaw] = useState<string>(SAMPLE_BATCH);
  const [parseError, setParseError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Review step
  const [job, setJob] = useState<ImportJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Done step
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  useEffect(() => {
    queueMicrotask(() => setSession(getSession()));
  }, []);

  const refreshJob = useCallback(async (jobId: string) => {
    setJobLoading(true);
    setJobError("");
    try {
      const j = await getImportJob(jobId);
      setJob(j);
    } catch (e) {
      setJobError(e instanceof ApiError ? e.message : "Couldn't load job.");
    } finally {
      setJobLoading(false);
    }
  }, []);

  async function onStartImport() {
    setParseError("");
    let body: { sourceTag: string; sourceType: "json"; records: MohRecord[] };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("Top-level must be an object.");
      if (typeof parsed.sourceTag !== "string" || !parsed.sourceTag.trim())
        throw new Error("`sourceTag` is required (string).");
      if (!Array.isArray(parsed.records) || parsed.records.length === 0)
        throw new Error("`records` must be a non-empty array.");
      body = {
        sourceTag: parsed.sourceTag,
        sourceType: "json",
        records: parsed.records as MohRecord[],
      };
    } catch (e) {
      setParseError(
        e instanceof Error
          ? `JSON error: ${e.message}`
          : "Could not parse the JSON body.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const { jobId } = await startMohImport(body);
      toast.success("Import job created.");
      await refreshJob(jobId);
      setStep("review");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start import.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setResolution(mohId: string, res: ImportResolution) {
    if (!job) return;
    // Optimistic update; persist on the next batch save.
    setJob({
      ...job,
      diffRecords: job.diffRecords.map((d) =>
        d.mohRegistryId === mohId ? { ...d, resolution: res } : d,
      ),
    });
  }

  async function saveResolutions() {
    if (!job) return;
    setSaving(true);
    try {
      const next = await updateImportResolutions(
        job.jobId,
        job.diffRecords.map((d) => ({
          mohRegistryId: d.mohRegistryId,
          resolution: d.resolution,
        })),
      );
      setJob(next);
      toast.success("Resolutions saved.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save resolutions.");
    } finally {
      setSaving(false);
    }
  }

  async function onApply() {
    if (!job) return;
    if (!window.confirm(
      `Apply import "${job.sourceTag}"?\n\n` +
        `This commits every record marked use_moh. ` +
        `Skipped / keep_current records are unchanged. ` +
        `Cannot be undone.`,
    )) return;
    setApplying(true);
    try {
      // Persist any unsaved resolution changes first so the apply doesn't 409.
      await updateImportResolutions(
        job.jobId,
        job.diffRecords.map((d) => ({
          mohRegistryId: d.mohRegistryId,
          resolution: d.resolution,
        })),
      );
      const result = await applyImport(job.jobId);
      setApplyResult(result);
      setStep("done");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't apply import.");
    } finally {
      setApplying(false);
    }
  }

  async function onCancel() {
    if (!job) return;
    if (!window.confirm("Cancel this import job? It cannot be resumed.")) return;
    setCancelling(true);
    try {
      await cancelImport(job.jobId);
      toast.success("Import cancelled.");
      reset();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel.");
    } finally {
      setCancelling(false);
    }
  }

  function reset() {
    setStep("compose");
    setJob(null);
    setApplyResult(null);
    setParseError("");
  }

  if (!session) return null;

  const initials = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  return (
    <>
      <Header
        title="MoH import"
        subtitle="Two-phase reconciliation: submit records → resolve diffs → apply."
        user={headerUser}
      />
      <PageWrapper>
        <div className="max-w-5xl space-y-5">
          <StepIndicator current={step} />

          {step === "compose" && (
            <ComposeStep
              raw={raw}
              setRaw={setRaw}
              parseError={parseError}
              submitting={submitting}
              onSubmit={onStartImport}
              onLoadSample={() => { setRaw(SAMPLE_BATCH); setParseError(""); }}
            />
          )}

          {step === "review" && job && (
            <ReviewStep
              job={job}
              loading={jobLoading}
              error={jobError}
              saving={saving}
              applying={applying}
              cancelling={cancelling}
              onSetResolution={setResolution}
              onSave={saveResolutions}
              onApply={onApply}
              onCancel={onCancel}
              onRefresh={() => void refreshJob(job.jobId)}
              onBack={reset}
            />
          )}

          {step === "done" && applyResult && (
            <DoneStep
              result={applyResult}
              sourceTag={job?.sourceTag ?? "—"}
              onStartAnother={reset}
            />
          )}
        </div>
      </PageWrapper>
    </>
  );
}

/* ─────────────────── steps ─────────────────── */

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "compose", label: "Compose" },
    { id: "review",  label: "Review & resolve" },
    { id: "done",    label: "Applied" },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "todo";
        return (
          <li key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                state === "done"   && "bg-brand-blue border-brand-blue text-white",
                state === "active" && "bg-white border-brand-blue text-brand-blue",
                state === "todo"   && "bg-white border-brand-border text-gray-400",
              )}
            >
              {state === "done" ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                state === "todo" ? "text-gray-400" : "text-brand-navy",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="flex-1 h-px bg-brand-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ComposeStep({
  raw,
  setRaw,
  parseError,
  submitting,
  onSubmit,
  onLoadSample,
}: {
  raw: string;
  setRaw: (v: string) => void;
  parseError: string;
  submitting: boolean;
  onSubmit: () => void;
  onLoadSample: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setRaw(reader.result);
    };
    reader.onerror = () => toast.error("Could not read file.");
    reader.readAsText(f);
  }

  const parsedCount = useMemo(() => {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p?.records) ? p.records.length : 0;
    } catch {
      return 0;
    }
  }, [raw]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-brand-blue" />
          Compose MoH batch
        </CardTitle>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload .json
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onLoadSample}>
            <Sparkles className="h-4 w-4" />
            Load sample
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">
        Required fields: <code>sourceTag</code>, <code>sourceType: &quot;json&quot;</code>,{" "}
        and a <code>records[]</code> array. Each record needs at least{" "}
        <code>mohRegistryId</code>, <code>name</code>, and <code>type</code>.
      </p>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
        rows={18}
        className={cn(
          "w-full px-3 py-2.5 font-mono text-xs border rounded-lg bg-gray-900 text-gray-100",
          "focus:outline-none focus:ring-2 focus:ring-brand-blue",
          parseError ? "border-brand-red" : "border-brand-border",
        )}
      />

      <div className="flex items-center justify-between mt-3">
        <p
          className={cn(
            "text-xs",
            parseError ? "text-brand-red" : "text-gray-500",
          )}
        >
          {parseError ||
            (parsedCount > 0
              ? `${parsedCount} record${parsedCount === 1 ? "" : "s"} ready to diff.`
              : "Paste a batch above to enable Start.")}
        </p>
        <Button onClick={onSubmit} loading={submitting} disabled={!parsedCount}>
          <PlayCircle className="h-4 w-4" />
          Start import
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function ReviewStep({
  job,
  loading,
  error,
  saving,
  applying,
  cancelling,
  onSetResolution,
  onSave,
  onApply,
  onCancel,
  onRefresh,
  onBack,
}: {
  job: ImportJob;
  loading: boolean;
  error: string;
  saving: boolean;
  applying: boolean;
  cancelling: boolean;
  onSetResolution: (id: string, r: ImportResolution) => void;
  onSave: () => void;
  onApply: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const pendingConflicts = job.diffRecords.filter(
    (d) => d.action === "conflict" && d.resolution === "pending",
  ).length;
  const canApply =
    job.status === "pending_review" && pendingConflicts === 0;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-brand-blue" />
              {job.sourceTag}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Job ID: {job.jobId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusTone(job.status)}>{job.status.replace(/_/g, " ")}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <CountBox label="New"        value={job.counts.new}       tone="green" />
          <CountBox label="Conflict"   value={job.counts.conflict}  tone="amber" />
          <CountBox label="Unchanged"  value={job.counts.unchanged} tone="gray"  />
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
            {error}
          </div>
        )}
      </Card>

      {/* Per-record */}
      <div className="space-y-3">
        {job.diffRecords.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500 text-center py-6">
              No records returned in the diff.
            </p>
          </Card>
        ) : (
          job.diffRecords.map((rec) => (
            <DiffRow
              key={rec.mohRegistryId}
              rec={rec}
              onChange={(r) => onSetResolution(rec.mohRegistryId, r)}
              disabled={job.status !== "pending_review"}
            />
          ))
        )}
      </div>

      {/* Sticky actions */}
      <div className="sticky bottom-2 bg-white border border-brand-border rounded-xl shadow-lg px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {pendingConflicts > 0 ? (
            <span className="text-brand-amber inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {pendingConflicts} conflict{pendingConflicts === 1 ? "" : "s"} still need a resolution.
            </span>
          ) : job.status === "pending_review" ? (
            <span className="text-brand-green inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All conflicts resolved — ready to apply.
            </span>
          ) : (
            <span>This job is {job.status.replace(/_/g, " ")}.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} disabled={applying || cancelling}>
            <ArrowLeft className="h-4 w-4" />
            Start over
          </Button>
          {job.status === "pending_review" && (
            <>
              <Button
                variant="outline"
                onClick={onSave}
                loading={saving}
                disabled={applying || cancelling}
              >
                Save resolutions
              </Button>
              <Button
                variant="danger"
                onClick={onCancel}
                loading={cancelling}
                disabled={applying}
              >
                <Trash2 className="h-4 w-4" />
                Cancel job
              </Button>
              <Button
                onClick={onApply}
                loading={applying}
                disabled={!canApply || cancelling}
              >
                <PlayCircle className="h-4 w-4" />
                Apply import
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffRow({
  rec,
  onChange,
  disabled,
}: {
  rec: ImportDiffRecord;
  onChange: (r: ImportResolution) => void;
  disabled?: boolean;
}) {
  const tone =
    rec.action === "new"
      ? "green"
      : rec.action === "conflict"
        ? "amber"
        : "gray";
  const resOptions: { value: ImportResolution; label: string; desc: string }[] = [
    { value: "use_moh",      label: "Use MoH",      desc: "Apply the incoming MoH values." },
    { value: "keep_current", label: "Keep current", desc: "Ignore the incoming values." },
    { value: "skip",         label: "Skip",         desc: "Do nothing for this record." },
    { value: "pending",      label: "Pending",      desc: "Decide later — blocks apply." },
  ];

  return (
    <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-gray border-b border-brand-border">
        <div className="min-w-0 flex items-center gap-3">
          <Badge variant={tone}>{rec.action}</Badge>
          <code className="font-mono text-xs text-gray-700 truncate">
            {rec.mohRegistryId}
          </code>
          {rec.conflictingFields && rec.conflictingFields.length > 0 && (
            <span className="text-[11px] text-brand-amber inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {rec.conflictingFields.join(", ")}
            </span>
          )}
        </div>
        <select
          value={rec.resolution}
          onChange={(e) => onChange(e.target.value as ImportResolution)}
          disabled={disabled}
          className={cn(
            "px-2 py-1.5 text-xs border rounded-lg bg-white text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue",
            "border-brand-border disabled:opacity-50",
          )}
          title={resOptions.find((o) => o.value === rec.resolution)?.desc}
        >
          {resOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-brand-border">
        <RecordPane title="Incoming (MoH)" data={rec.incoming} />
        <RecordPane
          title="Existing (current)"
          data={rec.existing ?? null}
          empty="No matching clinic in the registry yet."
        />
      </div>
    </div>
  );
}

function RecordPane({
  title,
  data,
  empty,
}: {
  title: string;
  data: Record<string, unknown> | null;
  empty?: string;
}) {
  return (
    <div className="p-4">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
        {title}
      </p>
      {!data || Object.keys(data).length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          {empty ?? "—"}
        </p>
      ) : (
        <dl className="space-y-1.5 text-xs">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500 font-medium">{k}</dt>
              <dd className="col-span-2 text-gray-800 break-words">
                {renderValue(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-gray-400 italic">—</span>;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return (
    <code className="font-mono text-[11px] text-gray-700">
      {JSON.stringify(v)}
    </code>
  );
}

function CountBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "gray";
}) {
  const toneText = {
    green: "text-brand-green",
    amber: "text-brand-amber",
    gray:  "text-gray-700",
  }[tone];
  return (
    <div className="rounded-lg border border-brand-border bg-brand-gray py-3">
      <p className={cn("text-2xl font-bold", toneText)}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mt-0.5">
        {label}
      </p>
    </div>
  );
}

function DoneStep({
  result,
  sourceTag,
  onStartAnother,
}: {
  result: ApplyResult;
  sourceTag: string;
  onStartAnother: () => void;
}) {
  return (
    <Card>
      <div className="text-center py-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-brand-green/15 border border-brand-green/30 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-brand-green" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-brand-navy">
          Import applied
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Batch <span className="font-mono text-gray-700">{sourceTag}</span> is
          now part of the registry.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto">
          <CountBox label="Created" value={result.created} tone="green" />
          <CountBox label="Updated" value={result.updated} tone="amber" />
          <CountBox label="Skipped" value={result.skipped} tone="gray" />
        </div>

        <Button onClick={onStartAnother} className="mt-6">
          <PlayCircle className="h-4 w-4" />
          Start another import
        </Button>
      </div>
    </Card>
  );
}

function statusTone(s: ImportJob["status"]): "amber" | "blue" | "green" | "gray" {
  if (s === "pending_review") return "amber";
  if (s === "applying")       return "blue";
  if (s === "applied")        return "green";
  return "gray";
}
