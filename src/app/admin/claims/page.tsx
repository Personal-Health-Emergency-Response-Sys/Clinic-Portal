"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
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
  reason: z.string().min(10, "Reason must be at least 10 characters."),
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
  const [rejectTarget, setRejectTarget] = useState<AdminClaim | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) });

  useEffect(() => { setSession(getSession()); }, []);

  const load = useCallback(async (
    status: StatusFilter,
    append = false,
    afterCursor?: string,
  ) => {
    setLoadError("");
    if (!append) setLoading(true);
    try {
      const result = await listClaims({ status, limit: 50, cursor: afterCursor });
      setClaims(prev => append ? [...prev, ...result.data] : result.data);
      setCursor(result.cursor ?? null);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setClaims([]);
    setCursor(null);
    void load(filter);
  }, [filter, load]);

  async function onApprove(claim: AdminClaim) {
    if (!window.confirm(
      `Approve claim for clinic ${claim.clinicId}?\n\nThis verifies the clinic and binds the submitter as admin.`,
    )) return;
    try {
      await approveClaim(claim.id);
      toast.success("Claim approved.");
      void load(filter);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not approve claim.");
    }
  }

  async function onReject(data: RejectForm) {
    if (!rejectTarget) return;
    try {
      await rejectClaim(rejectTarget.id, data.reason);
      toast.success("Claim rejected.");
      setRejectTarget(null);
      reset();
      void load(filter);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not reject claim.");
    }
  }

  if (!session) return null;

  const initials   = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  return (
    <>
      <Header
        title="Approve Clinics"
        subtitle="Review and act on pending clinic registration claims"
        user={headerUser}
      />
      <PageWrapper>
        <div className="max-w-5xl space-y-4">
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
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent hover:border-brand-border transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
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
              <p className="text-sm text-gray-500 py-12 text-center">Loading…</p>
            ) : claims.length === 0 ? (
              <p className="text-sm text-gray-500 py-12 text-center">
                No {filter} claims.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-brand-gray">
                      {["Clinic ID", "Submitted by", "Status", "Submitted", "Actions"].map((h) => (
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
                    {claims.map((claim) => {
                      const badge = STATUS_BADGE[claim.status];
                      return (
                        <tr
                          key={claim.id}
                          className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors"
                        >
                          <td className="px-6 py-3 text-sm text-gray-700 font-mono">
                            {claim.clinicId}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 font-mono">
                            {claim.submittedBy}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">
                            {formatDate(new Date(claim.createdAt))}
                          </td>
                          <td className="px-6 py-3">
                            {claim.status === "pending" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void onApprove(claim)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => { reset(); setRejectTarget(claim); }}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : claim.status === "rejected" && claim.reason ? (
                              <span className="text-xs text-gray-500 italic max-w-xs truncate block">
                                {claim.reason}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
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

        {/* Reject modal */}
        <Modal
          open={!!rejectTarget}
          onClose={() => { setRejectTarget(null); reset(); }}
          title="Reject claim"
        >
          <form onSubmit={handleSubmit(onReject)} className="space-y-4">
            <p className="text-sm text-gray-600">
              Clinic:{" "}
              <span className="font-mono font-medium text-gray-900">
                {rejectTarget?.clinicId}
              </span>
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Reason{" "}
                <span className="text-gray-400 font-normal">(sent to submitter by SMS)</span>
              </label>
              <textarea
                rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue
                  transition-colors resize-none ${
                    errors.reason ? "border-brand-red" : "border-brand-border"
                  }`}
                placeholder="Documents could not be verified — please resubmit clearer scans."
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-xs text-brand-red">{errors.reason.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" variant="danger" className="flex-1" loading={isSubmitting}>
                Reject claim
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setRejectTarget(null); reset(); }}
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
