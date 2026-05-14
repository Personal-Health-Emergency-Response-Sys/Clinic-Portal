"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { MapPin, Save, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { CLINIC_SPECIALTIES } from "@/lib/constants";
import { fetchPortalClinic, updatePortalProfile } from "@/lib/portalApi";
import type { PortalClinic } from "@/lib/portalApi";
import { ApiError } from "@/lib/api";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["clinic", "hospital"]),
  address: z.string().max(500).optional(),
  specialty: z.string().min(1, "Specialty is required"),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
});

type ProfileForm = z.infer<typeof profileSchema>;

/** Facility + map: `GET/PUT /api/v1/portal/clinic` (not phones, status, or ambulance). */
export default function ProfilePage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<PortalClinic | null>(null);
  const [loadError, setLoadError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileForm>,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError("");
      try {
        const c = await fetchPortalClinic();
        if (cancelled) return;
        setClinic(c);
        const lng = c.location?.coordinates?.[0];
        const lat = c.location?.coordinates?.[1];
        profileForm.reset({
          name: c.name,
          type: c.type,
          address: c.address ?? "",
          specialty: c.specialty,
          lat: lat ?? 9.03,
          lng: lng ?? 38.75,
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
  }, [profileForm]);

  async function onProfileSubmit(data: ProfileForm) {
    setProfileSaved(false);
    try {
      const updated = await updatePortalProfile({
        name: data.name,
        type: data.type,
        address: data.address || undefined,
        specialty: data.specialty,
        location: { lat: data.lat, lng: data.lng },
      });
      setClinic(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Save failed.");
    }
  }

  if (!user) return null;

  const isAdmin = user.role === "clinic_admin";

  return (
    <>
      <Header
        title="Facility & location"
        subtitle="GET/PUT /api/v1/portal/clinic — name, type, address, specialty, coordinates"
        user={user}
      />
      <PageWrapper>
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        {!isAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-5">
            Only a clinic administrator can change facility details.{" "}
            <Link href="/operational-status" className="font-medium text-brand-blue hover:underline">
              Operational status
            </Link>{" "}
            can still be updated by operators.
          </div>
        )}

        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="max-w-3xl space-y-5">
          <fieldset disabled={!isAdmin} className="space-y-5 min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Facility details</CardTitle>
                {clinic?.verified ? (
                  <Badge variant="green">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="amber">Pending verification</Badge>
                )}
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Clinic / hospital name"
                  error={profileForm.formState.errors.name?.message}
                  {...profileForm.register("name")}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Facility type</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-brand-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    {...profileForm.register("type")}
                  >
                    <option value="clinic">Clinic</option>
                    <option value="hospital">Hospital</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Specialty</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-brand-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    {...profileForm.register("specialty")}
                  >
                    {CLINIC_SPECIALTIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {profileForm.formState.errors.specialty && (
                    <p className="text-xs text-brand-red">
                      {profileForm.formState.errors.specialty.message}
                    </p>
                  )}
                </div>
                <Input
                  label="Address"
                  placeholder="Street, landmark, city…"
                  error={profileForm.formState.errors.address?.message}
                  {...profileForm.register("address")}
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Map location</CardTitle>
                <MapPin className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <p className="text-xs text-gray-500 mb-3">
                Coordinates are stored as latitude / longitude and power nearby search in the mobile app.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  error={profileForm.formState.errors.lat?.message}
                  {...profileForm.register("lat")}
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  error={profileForm.formState.errors.lng?.message}
                  {...profileForm.register("lng")}
                />
              </div>
            </Card>
          </fieldset>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              loading={profileForm.formState.isSubmitting}
              size="lg"
              disabled={!isAdmin}
            >
              <Save className="h-4 w-4" />
              Save facility details
            </Button>
            {profileSaved && (
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
