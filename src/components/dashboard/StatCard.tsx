// src/components/dashboard/StatCard.tsx

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accent?: "blue" | "green" | "amber" | "red";
}

const accents = {
  blue:  "border-l-brand-blue bg-blue-50",
  green: "border-l-brand-green bg-green-50",
  amber: "border-l-brand-amber bg-amber-50",
  red:   "border-l-brand-red bg-red-50",
};

const iconColors = {
  blue:  "text-brand-blue",
  green: "text-brand-green",
  amber: "text-brand-amber",
  red:   "text-brand-red",
};

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent = "blue",
}: StatCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNeutral = change === undefined || change === 0;

  return (
    <div className={cn(
      "bg-white rounded-xl border border-brand-border shadow-sm p-5 border-l-4",
      accents[accent]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn("p-2 rounded-lg bg-white shadow-sm", iconColors[accent])}>
          {icon}
        </div>
      </div>

      {change !== undefined && changeLabel !== undefined && (
      <div className="mt-3 flex items-center gap-1 text-xs">
        {isNeutral ? (
          <Minus className="h-3 w-3 text-gray-400" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3 text-brand-green" />
        ) : (
          <TrendingDown className="h-3 w-3 text-brand-red" />
        )}
        <span className={cn(
          "font-semibold",
          isNeutral ? "text-gray-500" : isPositive ? "text-brand-green" : "text-brand-red"
        )}>
          {isPositive ? "+" : ""}{change}%
        </span>
        <span className="text-gray-400">{changeLabel}</span>
      </div>
      )}
    </div>
  );
}