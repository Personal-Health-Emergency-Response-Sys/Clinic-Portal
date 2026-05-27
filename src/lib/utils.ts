// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  // +251912345678 → +251 91 234 5678
  if (phone.length !== 13) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}

export function timeUntil(date: Date): { hours: number; minutes: number; seconds: number; totalMs: number } {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  const hours   = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  return { hours, minutes, seconds, totalMs: diff };
}

export function formatCountdown(hours: number, minutes: number, seconds: number): string {
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

export function getStatusColor(outcome: string): string {
  switch (outcome) {
    case "session_created": return "text-brand-green bg-green-50";
    case "call_failed":     return "text-brand-red bg-red-50";
    case "fallback_used":   return "text-brand-amber bg-amber-50";
    default:                return "text-gray-600 bg-gray-100";
  }
}

/**
 * Format a date for display. Returns "—" for any unusable input
 * (`null`, `undefined`, `""`, Invalid Date) instead of throwing
 * `RangeError: Invalid time value` from Intl.DateTimeFormat — that
 * crashes the whole React subtree when a backend field is missing.
 *
 * Accepts a `Date`, an ISO string, an epoch number, or any nullish
 * value. Existing call sites that pass `new Date(stringFromApi)` keep
 * working unchanged.
 */
export function formatDate(
  input: Date | string | number | null | undefined,
): string {
  if (input === null || input === undefined || input === "") return "—";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ET", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}