// src/lib/constants.ts

import { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  /** GET/PUT /api/v1/portal/clinic (facility fields only in UI) */
  { label: "Facility", href: "/profile", icon: "Building2" },
  /** PUT /api/v1/portal/clinic/status */
  { label: "Operational status", href: "/operational-status", icon: "Gauge" },
  /** PUT /api/v1/portal/clinic/phones */
  { label: "Phone numbers", href: "/phone-numbers", icon: "Phone" },
  /** PUT /api/v1/portal/clinic/ambulance */
  { label: "Ambulance", href: "/ambulance", icon: "Siren" },
  /** GET /api/v1/portal/sos-queue */
  { label: "SOS queue", href: "/sos-queue", icon: "FileText" },
  /** GET/POST/DELETE /api/v1/portal/drivers */
  { label: "Drivers", href: "/drivers", icon: "Truck", adminOnly: true },
  /** GET/POST/DELETE /api/v1/portal/operators */
  { label: "Operators", href: "/operators", icon: "Users", adminOnly: true },
];

/** Matches backend `portal.validation` / Clinic schema */
export const ETHIOPIAN_PHONE_REGEX = /^\+251[79]\d{8}$/;

export const OPERATIONAL_STATUS_ENUM = [
  "Available",
  "Busy",
  "Capacity-Full",
  "Closed",
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUS_ENUM)[number];

export const OPERATIONAL_STATUSES: OperationalStatus[] = [...OPERATIONAL_STATUS_ENUM];

export const CLINIC_SPECIALTIES: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "pediatrics", label: "Pediatrics" },
  { value: "obstetrics", label: "Obstetrics" },
  { value: "cardiology", label: "Cardiology" },
  { value: "trauma", label: "Trauma" },
  { value: "internal_medicine", label: "Internal medicine" },
  { value: "surgery", label: "Surgery" },
  { value: "other", label: "Other" },
];
