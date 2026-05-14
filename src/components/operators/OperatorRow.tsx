"use client";

import { UserX } from "lucide-react";
import type { PortalOperator } from "@/lib/portalApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

const STATUS_BADGE: Record<string, { label: string; variant: "green" | "amber" | "gray" }> = {
  active: { label: "Active", variant: "green" },
  pending_verification: { label: "Pending signup", variant: "amber" },
  deactivated: { label: "Inactive", variant: "gray" },
};

interface OperatorRowProps {
  operator: PortalOperator;
  onDeactivate: (id: string) => void;
}

export function OperatorRow({ operator, onDeactivate }: OperatorRowProps) {
  const badge = STATUS_BADGE[operator.status] ?? {
    label: operator.status,
    variant: "gray" as const,
  };
  const initials = operator.phone.replace(/\D/g, "").slice(-2) || "??";

  return (
    <tr className="border-t border-brand-border hover:bg-brand-gray/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{operator.phone}</p>
            <p className="text-xs text-gray-500">Portal operator</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </td>
      <td className="px-6 py-4 text-xs text-gray-500">
        {formatDate(new Date(operator.createdAt))}
      </td>
      <td className="px-6 py-4 text-xs text-gray-500">
        {operator.lastLogin ? formatDate(new Date(operator.lastLogin)) : "Never"}
      </td>
      <td className="px-6 py-4">
        {operator.status !== "deactivated" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-brand-red hover:bg-red-50"
            onClick={() => onDeactivate(operator.id)}
          >
            <UserX className="h-3.5 w-3.5" />
            Deactivate
          </Button>
        )}
      </td>
    </tr>
  );
}
