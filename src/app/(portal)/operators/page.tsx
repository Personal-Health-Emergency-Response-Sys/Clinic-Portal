"use client";

import { useEffect, useState } from "react";
import { UserPlus, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OperatorRow } from "@/components/operators/OperatorRow";
import { useAuth } from "@/hooks/useAuth";
import { ETHIOPIAN_PHONE_REGEX } from "@/lib/constants";
import {
  fetchOperators,
  inviteOperator,
  deactivateOperator,
  type PortalOperator,
} from "@/lib/portalApi";
import { ApiError } from "@/lib/api";

const inviteSchema = z.object({
  phone: z.string().regex(ETHIOPIAN_PHONE_REGEX, "Use +2519… or +2517…"),
  email: z.union([z.literal(""), z.string().email()]),
  firstName: z.string().max(80).optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function OperatorsPage() {
  const { user } = useAuth();
  const [operators, setOperators] = useState<PortalOperator[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  async function load() {
    setLoadError("");
    setLoading(true);
    try {
      setOperators(await fetchOperators());
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load operators.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  async function onInvite(data: InviteForm) {
    try {
      const res = await inviteOperator({
        phone: data.phone,
        email: data.email || undefined,
        firstName: data.firstName || undefined,
      });
      toast.success("Invitation sent by SMS.");
      if (res.devToken) {
        toast.success(`Dev token (non-prod): ${res.devToken}`, { duration: 12_000 });
      }
      setModalOpen(false);
      reset();
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Invite failed.");
    }
  }

  async function onDeactivate(id: string) {
    if (!window.confirm("Deactivate this operator?")) return;
    try {
      await deactivateOperator(id);
      toast.success("Operator deactivated.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not deactivate.");
    }
  }

  if (!user) return null;

  if (user.role !== "clinic_admin") {
    return (
      <>
        <Header title="Operators" subtitle="Restricted" user={user} />
        <PageWrapper>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Only clinic administrators can list or manage operators (GET /portal/operators requires the clinic_admin
            role).
          </div>
        </PageWrapper>
      </>
    );
  }

  const activeCount = operators.filter((o) => o.status !== "deactivated").length;

  return (
    <>
      <Header title="Operators" subtitle="Portal staff accounts for your clinic" user={user} />
      <PageWrapper>
        <div className="max-w-4xl space-y-5">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="h-4 w-4 text-brand-blue flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Operators share most portal views with admins but cannot edit facility details, phone numbers, or staff
              invitations — matching the backend role matrix.
            </p>
          </div>

          <Card padding="none">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <CardTitle>
                Operators ({activeCount} active)
              </CardTitle>
              <Button size="sm" onClick={() => { reset(); setModalOpen(true); }}>
                <UserPlus className="h-3.5 w-3.5" />
                Invite operator
              </Button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-brand-gray">
                      {["Operator", "Status", "Since", "Last login", "Actions"].map((h) => (
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
                    {operators.map((op) => (
                      <OperatorRow key={op.id} operator={op} onDeactivate={onDeactivate} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite operator">
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
            <Input
              label="Phone"
              placeholder="+251911234567"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input label="First name (optional)" {...register("firstName")} />
            <Input
              label="Email (optional)"
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1" loading={isSubmitting}>
                Send invitation
              </Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </PageWrapper>
    </>
  );
}
