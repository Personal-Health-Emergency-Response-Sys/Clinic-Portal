"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getSession, type AuthSession } from "@/lib/authSession";
import { listClaims } from "@/lib/adminApi";

export default function AdminDashboardPage() {
  const [session,      setSession]      = useState<AuthSession | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [countHasMore, setCountHasMore] = useState(false);

  useEffect(() => { setSession(getSession()); }, []);

  useEffect(() => {
    listClaims({ status: "pending", limit: 50 })
      .then((r) => {
        setPendingCount(r.data.length);
        setCountHasMore(!!r.cursor);
      })
      .catch(() => setPendingCount(null));
  }, []);

  if (!session) return null;

  const phone    = session.user.phone;
  const initials = phone.replace(/\D/g, "").slice(-2);

  return (
    <>
      <Header
        title="System admin dashboard"
        subtitle="Platform overview and moderation tools"
        user={{ ...session.user, clinicName: "", avatarInitials: initials }}
      />
      <PageWrapper>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Pending clinic claims"
            value={
              pendingCount === null ? "…" :
              countHasMore          ? `${pendingCount}+` :
                                      pendingCount
            }
            icon={<ClipboardCheck className="h-5 w-5" />}
            accent="amber"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Signed-in account</CardTitle>
          </CardHeader>
          <div className="text-sm">
            <div className="flex justify-between border-b border-brand-border py-2">
              <span className="text-gray-600">Role</span>
              <Badge variant="blue">system_admin</Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Phone</span>
              <span className="text-gray-900 font-medium">{phone}</span>
            </div>
          </div>
        </Card>
      </PageWrapper>
    </>
  );
}
