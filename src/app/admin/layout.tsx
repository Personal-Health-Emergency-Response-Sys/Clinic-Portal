"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  ClipboardCheck,
  Upload,
  Key,
  Settings,
  ScrollText,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, clearSession, type AuthSession } from "@/lib/authSession";
import { logoutRequest } from "@/lib/authApi";

const CLINIC_ROLES = new Set(["clinic_admin", "clinic_operator"]);

const ADMIN_NAV = [
  { label: "Dashboard",       href: "/admin/dashboard",  Icon: LayoutDashboard },
  { label: "Approve Clinics", href: "/admin/claims",     Icon: ClipboardCheck },
  { label: "Users",           href: "/admin/users",      Icon: Users          },
  { label: "MoH Import",      href: "/admin/moh-import", Icon: Upload         },
  { label: "HIS Keys",        href: "/admin/his-keys",   Icon: Key            },
  { label: "Settings",        href: "/admin/settings",   Icon: Settings       },
  { label: "Event Logs",      href: "/admin/logs",       Icon: ScrollText     },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading]  = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    queueMicrotask(() => {
      setSession(getSession());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) { router.replace("/login"); return; }
    if (session.user.role !== "system_admin") {
      router.replace(CLINIC_ROLES.has(session.user.role) ? "/dashboard" : "/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || session.user.role !== "system_admin") return null;

  const phone    = session.user.phone;
  const initials = phone.replace(/\D/g, "").slice(-2);

  async function handleLogout() {
    try {
      await logoutRequest();
    } catch {
      // still clear locally
    } finally {
      clearSession();
      setSession(null);
      router.replace("/login");
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 min-h-screen bg-brand-navy flex flex-col">
        {/* Brand header */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">SmartHERS</p>
              <p className="text-blue-300 text-[10px] mt-0.5">System Admin</p>
            </div>
          </div>
        </div>

        {/* Identity chip */}
        <div className="px-4 py-3 mx-3 mt-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-blue-200 text-[10px] uppercase tracking-wider font-semibold">
            Signed in as
          </p>
          <p className="text-white text-sm font-medium mt-0.5 truncate">{phone}</p>
          <p className="text-blue-300 text-xs">System administrator</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 mt-4 space-y-0.5">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
            Admin menu
          </p>
          {ADMIN_NAV.map(({ label, href, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-blue-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{phone}</p>
              <p className="text-blue-300 text-[10px] truncate">Signed in</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
