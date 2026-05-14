import {
  clearSession,
  getSession,
  mergeSessionTokens,
  type AuthSession,
} from "./authSession";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBase(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function messageFromBody(body: unknown): string {
  const j = body as {
    error?: string;
    errors?: { field?: string; message?: string }[];
  };
  if (j?.error) return j.error;
  if (Array.isArray(j?.errors) && j.errors.length) {
    return j.errors.map((e) => `${e.field ?? "?"}: ${e.message ?? ""}`).join("; ");
  }
  return "Request failed";
}

async function tryRefresh(refreshToken: string): Promise<AuthSession | null> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const body = (await res.json()) as {
    success?: boolean;
    data?: { accessToken: string; refreshToken: string };
  };
  if (!body.success || !body.data?.accessToken || !body.data?.refreshToken) {
    clearSession();
    return null;
  }
  mergeSessionTokens(body.data.accessToken, body.data.refreshToken);
  return getSession();
}

export async function apiJson<T>(
  path: string,
  init: (RequestInit & { auth?: boolean }) = {},
): Promise<T> {
  const { auth = true, ...rest } = init;
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const headers = new Headers(rest.headers);
  if (rest.body && typeof rest.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const session = auth ? getSession() : null;
  if (auth && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  let res = await fetch(url, { ...rest, headers });

  if (res.status === 401 && auth && session?.refreshToken) {
    const next = await tryRefresh(session.refreshToken);
    if (next?.accessToken) {
      headers.set("Authorization", `Bearer ${next.accessToken}`);
      res = await fetch(url, { ...rest, headers });
    }
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { success: false, error: text };
  }

  if (!res.ok) {
    throw new ApiError(messageFromBody(body), res.status);
  }

  const wrapped = body as { success?: boolean; data?: T; error?: string };
  if (!wrapped || wrapped.success !== true) {
    throw new ApiError(wrapped?.error || messageFromBody(body), res.status);
  }
  return wrapped.data as T;
}
