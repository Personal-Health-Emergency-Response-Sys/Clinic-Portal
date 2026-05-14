// src/components/ui/Badge.tsx

import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "green" | "red" | "amber" | "blue" | "gray";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  green: "bg-green-50 text-green-700 border-green-200",
  red:   "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue:  "bg-blue-50 text-blue-700 border-blue-200",
  gray:  "bg-gray-100 text-gray-600 border-gray-200",
};

export function Badge({ variant = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}