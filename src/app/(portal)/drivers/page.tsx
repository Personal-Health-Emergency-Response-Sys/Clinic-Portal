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
import { DriverRow } from "@/components/drivers/DriverRow";
import { useAuth } from "@/hooks/useAuth";
import { ETHIOPIAN_PHONE_REGEX } from "@/lib/constants";
import {
  fetchDrivers,
  inviteDriver,
  deactivateDriver,
  type PortalDriver,
} from "@/lib/portalApi";
import { ApiError } from "@/lib/api";

const inviteSchema = z.object({
  phone: z.string().regex(ETHIOPIAN_PHONE_REGEX, "Use +2519… or +2517…"),
  email: z.union([z.literal(""), z.string().email()]),
  firstName: z.string().max(80).optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function DriversPage() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<PortalDriver[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const isAdmin = user?.role === "clinic_admin";

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  async function load() {
    setLoadError("");
    setLoading(true);
    try {
      setDrivers(await fetchDrivers());
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load drivers.");
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
      const res = await inviteDriver({
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
    if (!window.confirm("Deactivate this driver? They will be signed out everywhere.")) return;
    try {
      await deactivateDriver(id);
      toast.success("Driver deactivated.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not deactivate.");
    }
  }

  if (!user) return null;

  return (
    <>
      <Header title="Drivers" subtitle="Clinic drivers from GET /portal/drivers" user={user} />
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
              Drivers accept SOS assignments in the mobile app. Inviting sends the raw token by SMS (and email if
              provided). Only clinic administrators can invite or deactivate drivers.
            </p>
          </div>

          <Card padding="none">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <CardTitle>Drivers ({drivers.length})</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => { reset(); setModalOpen(true); }}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite driver
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-brand-gray">
                      {["Driver", "Duty", "Last login", "Actions"].map((h) => (
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
                    {drivers.map((d) => (
                      <DriverRow key={d.id} driver={d} isAdmin={!!isAdmin} onDeactivate={onDeactivate} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite driver">
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
            <Input
              label="Phone"
              placeholder="+251911234567"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label="First name (optional)"
              {...register("firstName")}
            />
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
