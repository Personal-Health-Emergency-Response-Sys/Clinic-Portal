"use client";

import { Bell, Search } from "lucide-react";
import type { PortalUser } from "@/lib/types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  user: PortalUser;
}

export function Header({ title, subtitle, user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-brand-border px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-brand-gray border border-brand-border rounded-lg px-3 py-1.5 w-52">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <input
            placeholder="Search…"
            className="bg-transparent text-xs text-gray-600 placeholder:text-gray-400 outline-none w-full"
            readOnly
            title="Search is not available yet"
          />
        </div>

        <button
          type="button"
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-brand-gray rounded-lg transition-colors"
          title="Notifications coming soon"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white text-xs font-bold">
          {user.avatarInitials}
        </div>
      </div>
    </header>
  );
}
