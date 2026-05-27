"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  ScrollText,
  X,
  Calendar,
  User as UserIcon,
  Target,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getSession, type AuthSession } from "@/lib/authSession";
import { ApiError } from "@/lib/api";
import {
  listLogs,
  type AdminLog,
  type AdminLogTargetType,
} from "@/lib/adminApi";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COMMON_TYPES = [
  "auth.login",
  "auth.login_failed",
  "sos.attempt",
  "sos.assigned",
  "sos.dismissed",
  "admin.config_update",
  "clinic.claim_approved",
  "clinic.claim_rejected",
  "driver.invited",
  "operator.invited",
  "his.status_push",
] as const;

const TARGET_TYPES: { value: AdminLogTargetType; label: string }[] = [
  { value: "user",            label: "User" },
  { value: "clinic",          label: "Clinic" },
  { value: "session",         label: "Session" },
  { value: "sos_attempt",     label: "SOS attempt" },
  { value: "assignment",      label: "Assignment" },
  { value: "system_config",   label: "System config" },
  { value: "invitation",      label: "Invitation" },
  { value: "his_key",         label: "HIS key" },
  { value: "moh_import_job",  label: "MoH import" },
];

interface Filters {
  type: string;
  targetType: AdminLogTargetType | "";
  actorId: string;
  since: string; // datetime-local format yyyy-mm-ddTHH:MM
  until: string;
}

const EMPTY_FILTERS: Filters = {
  type: "",
  targetType: "",
  actorId: "",
  since: "",
  until: "",
};

export default function AdminLogsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [logs, setLogs]       = useState<AdminLog[]>([]);
  const [cursor, setCursor]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    queueMicrotask(() => setSession(getSession()));
  }, []);

  const load = useCallback(
    async (
      next: Filters,
      append = false,
      afterCursor?: string | null,
    ) => {
      if (!append) queueMicrotask(() => setLoading(true));
      try {
        const params: Parameters<typeof listLogs>[0] = { limit: 50 };
        if (next.type.trim())       params.type       = next.type.trim();
        if (next.targetType)        params.targetType = next.targetType;
        if (next.actorId.trim())    params.actorId    = next.actorId.trim();
        if (next.since) params.since = toIso(next.since);
        if (next.until) params.until = toIso(next.until);
        if (afterCursor)            params.cursor     = afterCursor;
        const result = await listLogs(params);
        setLogs((prev) => (append ? [...prev, ...result.data] : result.data));
        setCursor(result.nextCursor);
        setError("");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not load logs.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    listLogs({ limit: 50 })
      .then((r) => {
        if (cancelled) return;
        setLogs(r.data);
        setCursor(r.nextCursor);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLogs([]);
        setCursor(null);
        setError(e instanceof ApiError ? e.message : "Could not load logs.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyFilters() {
    void load(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    void load(EMPTY_FILTERS);
  }

  function quickType(t: string) {
    const next = { ...filters, type: t };
    setFilters(next);
    void load(next);
  }

  if (!session) return null;

  const initials = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  const hasFilters = Object.values(filters).some((v) => v && v.length > 0);

  return (
    <>
      <Header
        title="Audit logs"
        subtitle="Every privileged action and security-relevant event."
        user={headerUser}
      />
      <PageWrapper>
        <div className="max-w-6xl space-y-4">
          {/* Filter card */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-blue" />
                Filters
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-brand-blue hover:underline inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <FilterField label="Type">
                <input
                  type="text"
                  list="log-types"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  placeholder="e.g. auth.login"
                  className={inputCls}
                />
                <datalist id="log-types">
                  {COMMON_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </FilterField>

              <FilterField label="Target type">
                <select
                  value={filters.targetType}
                  onChange={(e) =>
                    setFilters({ ...filters, targetType: e.target.value as AdminLogTargetType | "" })
                  }
                  className={inputCls}
                >
                  <option value="">Any</option>
                  {TARGET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Actor user ID">
                <input
                  type="text"
                  value={filters.actorId}
                  onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}
                  placeholder="user-…"
                  className={cn(inputCls, "font-mono")}
                />
              </FilterField>

              <FilterField label="Since">
                <input
                  type="datetime-local"
                  value={filters.since}
                  onChange={(e) => setFilters({ ...filters, since: e.target.value })}
                  className={inputCls}
                />
              </FilterField>

              <FilterField label="Until">
                <input
                  type="datetime-local"
                  value={filters.until}
                  onChange={(e) => setFilters({ ...filters, until: e.target.value })}
                  className={inputCls}
                />
              </FilterField>

              <div className="flex items-end gap-2">
                <Button type="button" onClick={applyFilters} disabled={loading} className="flex-1">
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void load(filters)}
                  disabled={loading}
                  title="Refresh with current filters"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* Quick chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {COMMON_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => quickType(t)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-full border transition-colors font-mono",
                    filters.type === t
                      ? "bg-brand-blue text-white border-brand-blue"
                      : "bg-white text-gray-600 border-brand-border hover:bg-brand-gray",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Card>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Log list */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-brand-blue" />
                {logs.length}
                {cursor ? "+" : ""} event{logs.length === 1 ? "" : "s"}
              </CardTitle>
              <p className="text-[11px] text-gray-400">
                Logs auto-expire per type retention.
              </p>
            </div>

            {loading && logs.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                Loading events…
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <ScrollText className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  No events match your filters
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Loosen the type, date range, or clear all filters.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-border">
                {logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    expanded={expanded.has(log.id)}
                    onToggle={() => toggleExpand(log.id)}
                  />
                ))}
              </ul>
            )}

            {cursor && !loading && (
              <div className="px-5 py-4 border-t border-brand-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void load(filters, true, cursor)}
                >
                  Load more
                </Button>
              </div>
            )}
          </Card>
        </div>
      </PageWrapper>
    </>
  );
}

/* ─────── pieces ─────── */

const inputCls = cn(
  "w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900",
  "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue",
  "transition-colors border-brand-border",
);

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: AdminLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = toneForType(log.type);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-3 hover:bg-brand-gray/50 transition-colors flex items-center gap-3"
      >
        <span className="flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </span>

        <Badge variant={tone}>{log.type}</Badge>

        <div className="flex-1 min-w-0 grid sm:grid-cols-3 gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1 truncate">
            <UserIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="font-mono truncate" title={log.actorId ?? "system"}>
              {log.actorId ?? <span className="italic text-gray-400">system</span>}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 truncate">
            <Target className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {log.targetType ?? "—"}
              {log.targetId ? (
                <span className="font-mono text-gray-500"> · {log.targetId}</span>
              ) : null}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 sm:justify-end whitespace-nowrap">
            <Calendar className="h-3 w-3 text-gray-400" />
            {formatDate(log.createdAt)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 pl-12">
          {log.meta && Object.keys(log.meta).length > 0 ? (
            <pre className="bg-gray-900 text-gray-100 text-[11px] rounded-lg p-3 overflow-x-auto font-mono">
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-gray-400 italic">No meta payload.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span>
              Log ID:{" "}
              <code className="font-mono text-gray-700">{log.id}</code>
            </span>
          </div>
        </div>
      )}
    </li>
  );
}

function toneForType(t: string): "green" | "amber" | "red" | "blue" | "gray" {
  if (t.startsWith("auth.login_failed")) return "red";
  if (t.startsWith("auth."))             return "blue";
  if (t.startsWith("sos."))              return "red";
  if (t.startsWith("admin."))            return "amber";
  if (t.startsWith("clinic.claim_approved")) return "green";
  if (t.startsWith("clinic.claim_rejected")) return "red";
  if (t.startsWith("his."))              return "blue";
  if (t.startsWith("driver.") || t.startsWith("operator.")) return "blue";
  return "gray";
}

function toIso(local: string): string {
  // datetime-local format: "2026-05-27T14:30" — convert to a full ISO string.
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
