// src/lib/claimApi.ts

import { apiJson } from "./api";
import { isDemoMode } from "./demo-mode";

export interface ClaimableClinic {
  id: string;
  name: string;
  type: "clinic" | "hospital";
  address?: string | null;
  specialty?: string | null;
  subSpecialty?: string | null;
  mohRegistryId?: string | null;
}

/**
 * Wire shape of `GET /api/v1/clinic-claims/clinics` — the public,
 * cursor-paginated picker endpoint. We only consume the first page in the
 * autocomplete; the picker is search-driven, not paginated.
 */
interface ClinicSearchPage {
  data: ClaimableClinic[];
  nextCursor: string | null;
}

export interface ClaimSubmissionInput {
  phone: string;
  fullName: string;
  password: string;
  clinicId: string;
  businessLicense: File;
  medicalCert: File;
}

export interface ClaimSubmissionResult {
  claimId: string;
  clinicId: string;
  status: "pending";
  submittedAt: string;
}

/** Minimum characters before the search fires. */
export const CLINIC_SEARCH_MIN_CHARS = 2;

/**
 * GET /api/v1/clinic-claims/clinics?q=<term> — public, no JWT. Returns
 * only unclaimed (verified:false) clinics by default. Free-text `q`
 * matches name / address / subSpecialty.
 *
 * Caller should debounce input and pass an AbortSignal so stale
 * responses are dropped when the user keeps typing.
 *
 * Returns `[]` if `query` is shorter than {@link CLINIC_SEARCH_MIN_CHARS}.
 *
 * Pagination (`nextCursor`) exists on the backend but isn't consumed —
 * the picker is search-driven and 20 results is the autocomplete budget.
 */
export async function fetchClaimableClinics(
  query: string,
  init?: { signal?: AbortSignal },
): Promise<ClaimableClinic[]> {
  const q = query.trim();
  if (q.length < CLINIC_SEARCH_MIN_CHARS) return [];

  if (isDemoMode()) {
    await abortableDelay(280, init?.signal);
    const needle = q.toLowerCase();
    return DEMO_CLAIMABLE_CLINICS.filter((c) =>
      `${c.name} ${c.address ?? ""} ${c.subSpecialty ?? ""}`
        .toLowerCase()
        .includes(needle),
    ).slice(0, 20);
  }

  const params = new URLSearchParams({ q, limit: "20" });
  const page = await apiJson<ClinicSearchPage>(
    `/api/v1/clinic-claims/clinics?${params.toString()}`,
    { auth: false, signal: init?.signal },
  );
  return page.data;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

const DEMO_CLAIMABLE_CLINICS: ClaimableClinic[] = [
  {
    id: "6a15942a98ab2939ad52795a",
    name: "ALERT Comprehensive Specialized Hospital",
    type: "hospital",
    address: "zenebework, Woreda 1, Kolfe Sub city, Addis Ababa",
    specialty: "general",
    subSpecialty: "Comprehensive Specialized Hospital",
    mohRegistryId: "mfr-1000932",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718293",
    name: "Tikur Anbessa Specialized Hospital",
    type: "hospital",
    address: "Lideta, Addis Ababa",
    specialty: "general",
    subSpecialty: "Specialized Hospital",
    mohRegistryId: "mfr-1000211",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718294",
    name: "St. Paul's Hospital Millennium Medical College",
    type: "hospital",
    address: "Gulele Sub city, Addis Ababa",
    specialty: "general",
    subSpecialty: "Teaching Hospital",
    mohRegistryId: "mfr-1000455",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718295",
    name: "Yekatit 12 Hospital Medical College",
    type: "hospital",
    address: "Arada Sub city, Addis Ababa",
    specialty: "general",
    subSpecialty: "Teaching Hospital",
    mohRegistryId: "mfr-1000456",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718296",
    name: "Bethel Teaching Hospital",
    type: "hospital",
    address: "Bole Sub city, Addis Ababa",
    specialty: "trauma",
    subSpecialty: "Teaching Hospital",
    mohRegistryId: "mfr-1000789",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718297",
    name: "Hayat Medical Center",
    type: "clinic",
    address: "Mexico Square, Addis Ababa",
    specialty: "general",
    subSpecialty: "Higher Clinic",
    mohRegistryId: "mfr-1001234",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718298",
    name: "Selam Health Center",
    type: "clinic",
    address: "Kazanchis, Addis Ababa",
    specialty: "general",
    subSpecialty: "Health Center",
    mohRegistryId: "mfr-1001567",
  },
  {
    id: "6a3e0a1b2c3d4e5f60718299",
    name: "Black Lion Pediatric Clinic",
    type: "clinic",
    address: "Lideta Sub city, Addis Ababa",
    specialty: "pediatrics",
    subSpecialty: "Specialty Clinic",
    mohRegistryId: "mfr-1001890",
  },
  {
    id: "6a3e0a1b2c3d4e5f6071829a",
    name: "Adama General Hospital",
    type: "hospital",
    address: "Adama, Oromia",
    specialty: "general",
    subSpecialty: "General Hospital",
    mohRegistryId: "mfr-1002001",
  },
  {
    id: "6a3e0a1b2c3d4e5f6071829b",
    name: "Hawassa University Comprehensive Specialized Hospital",
    type: "hospital",
    address: "Hawassa, Sidama",
    specialty: "general",
    subSpecialty: "Comprehensive Specialized Hospital",
    mohRegistryId: "mfr-1002145",
  },
  {
    id: "6a3e0a1b2c3d4e5f6071829c",
    name: "Mekelle General Hospital",
    type: "hospital",
    address: "Mekelle, Tigray",
    specialty: "general",
    subSpecialty: "General Hospital",
    mohRegistryId: "mfr-1002330",
  },
];

/**
 * POST /api/v1/clinic-claims — public, multipart/form-data.
 * Mirrors the SmartHERS Claim & Invitation flow (see backend Postman doc).
 *
 * No Authorization header. Backend rate-limits at 10 req / 15 min / IP.
 */
export async function submitClinicClaim(
  input: ClaimSubmissionInput,
): Promise<ClaimSubmissionResult> {
  if (isDemoMode()) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return {
      claimId: `demo_${Date.now().toString(36)}`,
      clinicId: input.clinicId || "demo_clinic_id",
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
  }

  const form = new FormData();
  form.append("phone", input.phone.trim());
  form.append("fullName", input.fullName.trim());
  form.append("password", input.password);
  form.append("clinicId", input.clinicId.trim());
  form.append("businessLicense", input.businessLicense);
  form.append("medicalCert", input.medicalCert);

  return apiJson<ClaimSubmissionResult>("/api/v1/clinic-claims", {
    method: "POST",
    body: form,
    auth: false,
  });
}

export const CLAIM_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const CLAIM_FILE_ACCEPT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export const CLAIM_FILE_ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.pdf";
