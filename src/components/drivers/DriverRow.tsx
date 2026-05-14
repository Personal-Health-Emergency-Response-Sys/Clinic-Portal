"use client";

import { UserX } from "lucide-react";
import type { PortalDriver } from "@/lib/portalApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

interface DriverRowProps {
  driver: PortalDriver;
  isAdmin: boolean;
  onDeactivate: (id: string) => void;
}

export function DriverRow({ driver, isAdmin, onDeactivate }: DriverRowProps) {
  const initials =
    (driver.firstName?.slice(0, 2).toUpperCase() ||
      driver.phone.replace(/\D/g, "").slice(-2)) ?? "??";

  return (
    <tr className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {driver.firstName || "Driver"}
            </p>
            <p className="text-xs text-gray-500">{driver.phone}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant={driver.onDuty ? "green" : "gray"}>
          {driver.onDuty ? "On duty" : "Off duty"}
        </Badge>
      </td>
      <td className="px-6 py-4 text-xs text-gray-500">
        {driver.lastLogin ? formatDate(new Date(driver.lastLogin)) : "Never"}
      </td>
      <td className="px-6 py-4">
        {isAdmin && driver.status !== "deactivated" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-brand-red hover:bg-red-50"
            onClick={() => onDeactivate(driver.id)}
          >
            <UserX className="h-3.5 w-3.5" />
            Deactivate
          </Button>
        )}
      </td>
    </tr>
  );
}
