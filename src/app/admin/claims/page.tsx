"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  FileText,
  ExternalLink,
  ImageOff,
  MapPin,
  Phone,
  User as UserIcon,
  Building2,
  Stethoscope,
  Hash,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ClipboardCopy,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getSession, type AuthSession } from "@/lib/authSession";
import { formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import {
  listClaims,
  approveClaim,
  rejectClaim,
  type AdminClaim,
} from "@/lib/adminApi";

type StatusFilter = "pending" | "approved" | "rejected";

const rejectSchema = z.object({
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters.")
    .max(500, "Reason must be 500 characters or fewer."),
});
type RejectForm = z.infer<typeof rejectSchema>;

const STATUS_BADGE: Record<
  AdminClaim["status"],
  { label: string; variant: "amber" | "green" | "red" }
> = {
  pending:  { label: "Pending",  variant: "amber" },
  approved: { label: "Approved", variant: "green" },
  rejected: { label: "Rejected", variant: "red"   },
};

export default function AdminClaimsPage() {
  const [session,      setSession]      = useState<AuthSession | null>(null);
  const [filter,       setFilter]       = useState<StatusFilter>("pending");
  const [claims,       setClaims]       = useState<AdminClaim[]>([]);
  const [cursor,       setCursor]       = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState("");
  const [detailClaim,  setDetailClaim]  = useState<AdminClaim | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminClaim | null>(null);
  const [acting,       setActing]       = useState<string | null>(null); // claim id currently approving/rejecting

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) });

  const reasonValue = watch("reason") ?? "";

  useEffect(() => { setSession(getSession()); }, []);

  const load = useCallback(async (
    status: StatusFilter,
    append = false,
    afterCursor?: string,
  ) => {
    if (!append) setLoading(true);
    setLoadError("");
    try {
      const result = await listClaims({ status, limit: 50, cursor: afterCursor });
      setClaims(prev => append ? [...prev, ...result.data] : result.data);
      setCursor(result.nextCursor);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter changes trigger a fresh load — state resets happen INSIDE the
  // promise callback, not synchronously in the effect body, to satisfy
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    listClaims({ status: filter, limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setClaims(result.data);
        setCursor(result.nextCursor);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setClaims([]);
        setCursor(null);
        setLoadError(e instanceof ApiError ? e.message : "Could not load claims.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filter]);

  async function onApprove(claim: AdminClaim) {
    const clinicName = claim.clinic?.name ?? "this clinic";
    const submitter = claim.submitterFullName || "the submitter";
    const phone = claim.submitterPhone || "";
    if (!window.confirm(
      `Approve claim for "${clinicName}"?\n\n` +
      `This verifies the clinic and creates a clinic_admin account for ${submitter}${phone ? ` (${phone})` : ""}.`,
    )) return;
    setActing(claim.id);
    try {
      await approveClaim(claim.id);
      toast.success(`Approved — ${clinicName}`);
      setDetailClaim(null);
      void load(filter);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not approve claim.");
    } finally {
      setActing(null);
    }
  }

  async function onReject(data: RejectForm) {
    if (!rejectTarget) return;
    const clinicName = rejectTarget.clinic?.name ?? "this clinic";
    setActing(rejectTarget.id);
    try {
      await rejectClaim(rejectTarget.id, data.reason);
      toast.success(`Rejected — ${clinicName}`);
      setRejectTarget(null);
      setDetailClaim(null);
      reset();
      void load(filter);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not reject claim.");
    } finally {
      setActing(null);
    }
  }

  if (!session) return null;

  const initials   = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  return (
    <>
      <Header
        title="Approve Clinics"
        subtitle="Review submitted documents, then approve or reject each claim"
        user={headerUser}
      />
      <PageWrapper>
        <div className="max-w-6xl space-y-4">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}

          {/* Status filter + refresh */}
          <div className="flex items-center gap-2">
            {(["pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-brand-blue text-white"
                    : "bg-white border border-brand-border text-gray-600 hover:bg-brand-gray"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void load(filter)}
              disabled={loading}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent hover:border-brand-border transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Table */}
          <Card padding="none">
            <div className="px-6 py-4 border-b border-brand-border">
              <CardTitle>
                {filter.charAt(0).toUpperCase() + filter.slice(1)} claims
                {!loading && ` (${claims.length}${cursor ? "+" : ""})`}
              </CardTitle>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Loading claims…
              </div>
            ) : claims.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  No {filter} claims
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {filter === "pending"
                    ? "Nothing waiting for review — great work."
                    : `No claims in the ${filter} bucket yet.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-brand-gray">
                      {["Clinic", "Submitter", "Status", "Submitted", "Documents", "Actions"].map((h) => (
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
                    {claims.map((claim) => (
                      <ClaimRow
                        key={claim.id}
                        claim={claim}
                        onView={() => setDetailClaim(claim)}
                        onApprove={() => void onApprove(claim)}
                        onReject={() => { reset(); setRejectTarget(claim); }}
                        busy={acting === claim.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {cursor && !loading && (
              <div className="px-6 py-4 border-t border-brand-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void load(filter, true, cursor)}
                >
                  Load more
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Detail modal */}
        <ClaimDetailModal
          claim={detailClaim}
          onClose={() => setDetailClaim(null)}
          onApprove={() => detailClaim && void onApprove(detailClaim)}
          onReject={() => {
            if (!detailClaim) return;
            reset();
            setRejectTarget(detailClaim);
          }}
          busy={!!(detailClaim && acting === detailClaim.id)}
        />

        {/* Reject modal */}
        <Modal
          open={!!rejectTarget}
          onClose={() => { setRejectTarget(null); reset(); }}
          title="Reject claim"
        >
          <form onSubmit={handleSubmit(onReject)} className="space-y-4">
            {rejectTarget && (
              <div className="rounded-lg bg-brand-gray border border-brand-border p-3 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  Rejecting
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {rejectTarget.clinic.name}
                </p>
                <p className="text-xs text-gray-600">
                  Submitted by {rejectTarget.submitterFullName} ·{" "}
                  {rejectTarget.submitterPhone}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Reason{" "}
                <span className="text-gray-400 font-normal">
                  (sent to submitter by SMS — 10 to 500 characters)
                </span>
              </label>
              <textarea
                rows={4}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue
                  transition-colors resize-none ${
                    errors.reason ? "border-brand-red" : "border-brand-border"
                  }`}
                placeholder="Documents could not be verified — please resubmit clearer scans of the business licence."
                {...register("reason")}
              />
              <div className="flex items-center justify-between text-[11px]">
                {errors.reason ? (
                  <p className="text-brand-red">{errors.reason.message}</p>
                ) : (
                  <p className="text-gray-400">
                    The submitter will see this exact text. Be specific so they
                    can fix it on the next attempt.
                  </p>
                )}
                <p className={`tabular-nums ${reasonValue.length > 500 ? "text-brand-red" : "text-gray-400"}`}>
                  {reasonValue.length}/500
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                variant="danger"
                className="flex-1"
                loading={isSubmitting || acting === rejectTarget?.id}
              >
                <XCircle className="h-4 w-4" />
                Reject claim
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setRejectTarget(null); reset(); }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </PageWrapper>
    </>
  );
}

/* ─────────────────────── Row ─────────────────────── */

function ClaimRow({
  claim,
  onView,
  onApprove,
  onReject,
  busy,
}: {
  claim: AdminClaim;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const badge = STATUS_BADGE[claim.status] ?? STATUS_BADGE.pending;
  const clinic = claim.clinic ?? null;
  return (
    <tr className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors">
      <td className="px-6 py-3 max-w-xs">
        <p className="text-sm font-medium text-gray-900 truncate">
          {clinic?.name || "Unnamed clinic"}
        </p>
        <p className="text-xs text-gray-500 capitalize truncate">
          {clinic?.type || "—"}
          {clinic?.address ? ` · ${clinic.address}` : ""}
        </p>
      </td>
      <td className="px-6 py-3">
        <p className="text-sm text-gray-900">
          {claim.submitterFullName || "Unknown submitter"}
        </p>
        <p className="text-xs text-gray-500 font-mono">
          {claim.submitterPhone || "—"}
        </p>
      </td>
      <td className="px-6 py-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </td>
      <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
        {formatDate(claim.submittedAt)}
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center gap-1.5 text-[11px]">
          <DocChip url={claim.businessLicenseUrl} label="License" />
          <DocChip url={claim.medicalCertUrl} label="Cert" />
        </div>
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
            Details
          </Button>
          {claim.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={busy}
                loading={busy}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={onReject}
                disabled={busy}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function DocChip({ url, label }: { url?: string | null; label: string }) {
  if (!url) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-gray-400 bg-gray-100 border border-gray-200"
        title="Document not uploaded"
      >
        <ImageOff className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-brand-blue bg-brand-blue/10 border border-brand-blue/20 hover:bg-brand-blue/20 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <FileText className="h-3 w-3" />
      {label}
    </a>
  );
}

/* ─────────────────────── Detail modal ─────────────────────── */

function ClaimDetailModal({
  claim,
  onClose,
  onApprove,
  onReject,
  busy,
}: {
  claim: AdminClaim | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  if (!claim) return null;
  const badge = STATUS_BADGE[claim.status] ?? STATUS_BADGE.pending;
  const clinic = claim.clinic ?? null;
  return (
    <Modal
      open={!!claim}
      onClose={onClose}
      width="2xl"
      title={`Claim · ${clinic?.name || "Unnamed clinic"}`}
    >
      <div className="space-y-6">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-gray border border-brand-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <Calendar className="h-3 w-3" />
              Submitted {formatDate(claim.submittedAt)}
            </span>
            {claim.reviewedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Clock className="h-3 w-3" />
                Reviewed {formatDate(claim.reviewedAt)}
              </span>
            )}
          </div>
          <CopyButton value={claim.id} label="Claim ID" />
        </div>

        {/* Clinic + submitter side-by-side */}
        <div className="grid sm:grid-cols-2 gap-4">
          <DetailCard
            icon={Building2}
            title="Clinic being claimed"
            tone="navy"
          >
            {clinic ? (
              <>
                <Field
                  label="Name"
                  value={clinic.name || <Muted>Unnamed clinic</Muted>}
                />
                <Field
                  label="Type"
                  value={
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      {clinic.type || <Muted>—</Muted>}
                      {clinic.verified ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-green">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-amber">
                          <ShieldAlert className="h-3 w-3" /> Unverified
                        </span>
                      )}
                    </span>
                  }
                />
                <Field
                  label="Address"
                  value={
                    clinic.address ? (
                      <span className="inline-flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{clinic.address}</span>
                      </span>
                    ) : (
                      <Muted>Not provided</Muted>
                    )
                  }
                />
                <Field
                  label="Specialty"
                  value={
                    clinic.specialty ? (
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Stethoscope className="h-3 w-3" />
                        {clinic.specialty.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <Muted>Not provided</Muted>
                    )
                  }
                />
                {clinic.subSpecialty && (
                  <Field label="Sub-specialty" value={clinic.subSpecialty} />
                )}
                <Field
                  label="Clinic ID"
                  value={
                    clinic.id ? (
                      <MonoCopy value={clinic.id} />
                    ) : (
                      <Muted>Unknown</Muted>
                    )
                  }
                />
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Clinic record is missing from this claim. The backend may have
                returned a partial response.
              </p>
            )}
          </DetailCard>

          <DetailCard icon={UserIcon} title="Submitter" tone="blue">
            <Field
              label="Full name"
              value={
                claim.submitterFullName || <Muted>Unknown submitter</Muted>
              }
            />
            <Field
              label="Phone"
              value={
                claim.submitterPhone ? (
                  <a
                    href={`tel:${claim.submitterPhone}`}
                    className="inline-flex items-center gap-1 text-brand-blue hover:underline font-mono"
                  >
                    <Phone className="h-3 w-3" />
                    {claim.submitterPhone}
                  </a>
                ) : (
                  <Muted>Not provided</Muted>
                )
              }
            />
            {claim.createdUserId ? (
              <Field
                label="Created user"
                value={<MonoCopy value={claim.createdUserId} />}
              />
            ) : (
              <Field
                label="Created user"
                value={
                  <span className="text-gray-400 italic">
                    Will be created on approval
                  </span>
                }
              />
            )}
            {claim.rejectionReason && (
              <Field
                label="Rejection reason"
                value={
                  <p className="text-brand-red leading-relaxed">
                    {claim.rejectionReason}
                  </p>
                }
              />
            )}
          </DetailCard>
        </div>

        {/* Document previews */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Verification documents
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <DocPreview
              label="Business license"
              url={claim.businessLicenseUrl}
            />
            <DocPreview label="Medical certificate" url={claim.medicalCertUrl} />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Documents are served from Cloudinary. Click a preview to open the
            original at full resolution in a new tab.
          </p>
        </div>

        {/* Sticky action bar for pending claims */}
        {claim.status === "pending" && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-brand-border">
            <Button onClick={onApprove} loading={busy} className="flex-1">
              <CheckCircle className="h-4 w-4" />
              Approve claim
            </Button>
            <Button
              variant="danger"
              onClick={onReject}
              disabled={busy}
              className="flex-1"
            >
              <XCircle className="h-4 w-4" />
              Reject claim
            </Button>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Close
            </Button>
          </div>
        )}
        {claim.status !== "pending" && (
          <div className="flex justify-end pt-2 border-t border-brand-border">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─────────────────────── Bits ─────────────────────── */

function DetailCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: "navy" | "blue";
  children: React.ReactNode;
}) {
  const toneClass = {
    navy: "bg-brand-navy/5 text-brand-navy border-brand-navy/15",
    blue: "bg-brand-blue/5 text-brand-blue border-brand-blue/15",
  }[tone];
  return (
    <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2 border-b border-brand-border ${toneClass}`}>
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      <dl className="p-4 space-y-3">{children}</dl>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-800 break-words">{value}</dd>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-400 italic">{children}</span>;
}

function MonoCopy({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-xs text-gray-700 bg-brand-gray border border-brand-border rounded px-1.5 py-0.5">
        {value}
      </code>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard.writeText(value);
          toast.success("Copied");
        }}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Copy"
      >
        <ClipboardCopy className="h-3 w-3" />
      </button>
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-600 bg-white border border-brand-border hover:bg-brand-gray transition-colors"
      title={value}
    >
      <Hash className="h-3 w-3" />
      <span className="font-mono">{value.slice(0, 8)}…</span>
      <ClipboardCopy className="h-3 w-3" />
    </button>
  );
}

function DocPreview({ label, url }: { label: string; url?: string | null }) {
  const ext = url ? url.split("?")[0].split(".").pop()?.toLowerCase() : null;
  const isImage = ext ? ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) : false;
  const isPdf = ext === "pdf";

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-brand-border bg-brand-gray flex flex-col items-center justify-center text-center px-4 py-8">
        <ImageOff className="h-7 w-7 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>
        <p className="text-[11px] text-gray-500">No file uploaded</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-border bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border bg-brand-gray">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-3.5 w-3.5 text-brand-blue flex-shrink-0" />
          <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline flex-shrink-0"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-brand-gray hover:bg-brand-blue/5 transition-colors"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="w-full h-56 object-contain bg-white"
            loading="lazy"
          />
        ) : isPdf ? (
          <div className="h-56 flex flex-col items-center justify-center text-center px-4">
            <FileText className="h-10 w-10 text-brand-red" />
            <p className="mt-2 text-sm font-medium text-gray-800">PDF document</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Click to open in a new tab
            </p>
          </div>
        ) : (
          <div className="h-56 flex flex-col items-center justify-center text-center px-4">
            <FileText className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-800">File</p>
            <p className="text-[11px] text-gray-500 mt-1 break-all">{ext || "unknown"}</p>
          </div>
        )}
      </a>
    </div>
  );
}
