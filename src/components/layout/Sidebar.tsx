"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Phone,
  Siren,
  FileText,
  Users,
  LogOut,
  Activity,
  Truck,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { PortalUser } from "@/lib/types";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Phone,
  Siren,
  FileText,
  Users,
  Truck,
  Gauge,
};

interface SidebarProps {
  user: PortalUser;
  onLogout: () => void | Promise<void>;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === "clinic_admin",
  );

  return (
    <aside className="w-64 min-h-screen bg-brand-navy flex flex-col">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">SmartHERS</p>
            <p className="text-blue-300 text-[10px] mt-0.5">Clinic Portal</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 mx-3 mt-4 rounded-lg bg-white/5 border border-white/10">
        <p className="text-blue-200 text-[10px] uppercase tracking-wider font-semibold">
          Current clinic
        </p>
        <p className="text-white text-sm font-medium mt-0.5 truncate">{user.clinicName}</p>
        <p className="text-blue-300 text-xs capitalize">{user.role.replace("_", " ")}</p>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
          Main menu
        </p>
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-blue-200 hover:bg-white/10 hover:text-white",
              )}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.phone}</p>
            <p className="text-blue-300 text-[10px] truncate">Signed in</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
