// src/components/ui/Toggle.tsx

"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Toggle({ checked, onChange, label, disabled, size = "md" }: ToggleProps) {
  const trackSize = size === "md" ? "w-12 h-6" : "w-9 h-5";
  const thumbSize = size === "md" ? "w-5 h-5" : "w-4 h-4";
  const thumbTranslate = size === "md"
    ? (checked ? "translate-x-6" : "translate-x-0.5")
    : (checked ? "translate-x-4" : "translate-x-0.5");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2",
        trackSize,
        checked ? "bg-brand-green" : "bg-gray-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow transition-transform duration-200",
          thumbSize,
          thumbTranslate
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}