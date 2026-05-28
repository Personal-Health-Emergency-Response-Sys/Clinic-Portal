"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Key,
  Search,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  RefreshCw,
  Copy,
  AlertTriangle,
  X,
  Building2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { getSession, type AuthSession } from "@/lib/authSession";
import { ApiError } from "@/lib/api";
import {
  listAdminClinics,
  getHisKeyMeta,
  generateHisKey,
  revokeHisKey,
  type AdminClinic,
  type HisKeyMeta,
  type HisKeyGenResult,
} from "@/lib/adminApi";
import { formatDate, cn } from "@/lib/utils";

export default function AdminHisKeysPage() {
  const [session, setSession]   = useState<AuthSession | null>(null);

  // Clinic picker
  const [query, setQuery]                 = useState("");
  const [clinics, setClinics]             = useState<AdminClinic[]>([]);
  const [picking, setPicking]             = useState(false);
  const [pickError, setPickError]         = useState("");
  const [selected, setSelected]           = useState<AdminClinic | null>(null);

  // Key state
  const [keyMeta, setKeyMeta]             = useState<HisKeyMeta | null>(null);
  const [keyLoading, setKeyLoading]       = useState(false);
  const [keyError, setKeyError]           = useState("");
  const [generating, setGenerating]       = useState(false);
  const [revoking, setRevoking]           = useState(false);
  const [rawKey, setRawKey]               = useState<HisKeyGenResult | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setSession(getSession()));
  }, []);

  /* Debounced clinic search */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPicking(true);
      setPickError("");
      listAdminClinics({ q, limit: 20 })
        .then((r) => { setClinics(r.data); setPicking(false); })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setPickError(
            e instanceof ApiError ? e.message : "Couldn't search clinics.",
          );
          setPicking(false);
        });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const loadKey = useCallback((clinicId: string) => {
    setKeyLoading(true);
    setKeyError("");
    getHisKeyMeta(clinicId)
      .then((m) => { setKeyMeta(m); setKeyLoading(false); })
      .catch((e) => {
        setKeyError(e instanceof ApiError ? e.message : "Couldn't load key.");
        setKeyLoading(false);
      });
  }, []);

  function pickClinic(c: AdminClinic) {
    setSelected(c);
    setKeyMeta(null);
    setRawKey(null);
    loadKey(c.id);
  }

  async function onGenerate() {
    if (!selected) return;
    if (
      keyMeta?.status === "active" &&
      !window.confirm(
        `This will REPLACE the existing active HIS key for "${selected.name}".\n\n` +
          `Anything currently authenticating with the old key will start receiving 401.\n\n` +
          `Continue?`,
      )
    ) return;
    setGenerating(true);
    try {
      const result = await generateHisKey(selected.id);
      setRawKey(result);
      // refresh the metadata view to show the new masked key
      loadKey(selected.id);
      toast.success("HIS key generated.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not generate key.");
    } finally {
      setGenerating(false);
    }
  }

  async function onRevoke() {
    if (!selected) return;
    setRevoking(true);
    try {
      await revokeHisKey(selected.id);
      toast.success("HIS key revoked.");
      setConfirmRevoke(false);
      loadKey(selected.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not revoke key.");
    } finally {
      setRevoking(false);
    }
  }

  if (!session) return null;

  const initials = session.user.phone.replace(/\D/g, "").slice(-2);
  const headerUser = { ...session.user, clinicName: "", avatarInitials: initials };

  return (
    <>
      <Header
        title="HIS API keys"
        subtitle="Each clinic can have one active HIS key. Generating issues a fresh sk_his_… token and replaces the previous one."
        user={headerUser}
      />
      <PageWrapper>
        <div className="max-w-4xl space-y-5">
          {/* Picker */}
          <Card>
            <CardTitle className="mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-blue" />
              Clinic
            </CardTitle>

            {selected ? (
              <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-blue">
                    Working on
                  </p>
                  <p className="text-sm font-semibold text-brand-navy truncate">
                    {selected.name}
                  </p>
                  <p className="text-xs text-gray-600 truncate mt-0.5">
                    {selected.address ?? "No address on file"} ·{" "}
                    <code className="font-mono">{selected.id}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelected(null); setKeyMeta(null); setRawKey(null); }}
                  className="text-xs text-gray-500 hover:text-brand-red inline-flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by clinic name or address (min 2 chars)"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-brand-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    autoFocus
                  />
                  {picking && (
                    <Loader2 className="h-4 w-4 text-brand-blue absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                  )}
                </div>

                {pickError && (
                  <p className="mt-2 text-xs text-brand-red">{pickError}</p>
                )}

                <div className="mt-3 space-y-2">
                  {query.trim().length < 2 ? (
                    <p className="text-xs text-gray-500">
                      Type at least 2 characters of the clinic&apos;s name to
                      search.
                    </p>
                  ) : !picking && clinics.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No clinics match &ldquo;{query}&rdquo;.
                    </p>
                  ) : (
                    clinics.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickClinic(c)}
                        className="w-full text-left rounded-lg border border-brand-border hover:border-brand-blue/50 hover:shadow-sm transition-all px-4 py-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-navy truncate">
                            {c.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {c.address ?? "—"}
                          </p>
                        </div>
                        <Badge variant={c.verified ? "green" : "amber"}>
                          {c.verified ? "verified" : "unverified"}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Key panel */}
          {selected && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-brand-blue" />
                  HIS API key
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadKey(selected.id)}
                  disabled={keyLoading}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", keyLoading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>

              {keyError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-3">
                  {keyError}
                </div>
              )}

              {keyLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Loading key…
                </div>
              ) : keyMeta && keyMeta.status ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand-border bg-brand-gray p-4 grid sm:grid-cols-3 gap-3">
                    <Field label="Status">
                      {keyMeta.status === "active" ? (
                        <Badge variant="green">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="red">
                          <ShieldOff className="h-3 w-3" /> Revoked
                        </Badge>
                      )}
                    </Field>
                    <Field label="Created">
                      {formatDate(keyMeta.createdAt)}
                    </Field>
                    <Field label="Revoked">
                      {keyMeta.revokedAt ? formatDate(keyMeta.revokedAt) : "—"}
                    </Field>
                  </div>

                  <Field label="Masked key">
                    <code className="block font-mono text-xs bg-gray-900 text-gray-100 rounded-lg px-3 py-2.5 overflow-x-auto">
                      {keyMeta.maskedKey ?? "—"}
                    </code>
                  </Field>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-border">
                    <Button onClick={onGenerate} loading={generating}>
                      <Sparkles className="h-4 w-4" />
                      {keyMeta.status === "active" ? "Rotate key" : "Generate new key"}
                    </Button>
                    {keyMeta.status === "active" && (
                      <Button
                        variant="danger"
                        onClick={() => setConfirmRevoke(true)}
                        disabled={generating || revoking}
                      >
                        <ShieldOff className="h-4 w-4" />
                        Revoke
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Generating replaces the existing key — the previous token
                    stops working immediately. Revoke just invalidates the
                    current key without issuing a new one.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-brand-border bg-brand-gray px-4 py-8 text-center">
                  <Key className="h-7 w-7 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm font-medium text-gray-800">
                    No HIS key has been issued for this clinic.
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Generate one to let the clinic&apos;s HIS push live status
                    updates over the API.
                  </p>
                  <Button onClick={onGenerate} loading={generating} className="mt-4">
                    <Sparkles className="h-4 w-4" />
                    Generate first key
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Raw-key reveal modal */}
        <Modal
          open={!!rawKey}
          onClose={() => setRawKey(null)}
          title="Copy this key now — it won't be shown again"
          width="lg"
        >
          {rawKey && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  The plaintext key is only ever returned once, at generation
                  time. Closing this dialog loses it permanently.
                </p>
              </div>

              <Field label="Plaintext key">
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-gray-900 text-gray-100 rounded-lg px-3 py-2.5 overflow-x-auto break-all">
                    {rawKey.rawKey}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(rawKey.rawKey);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </Field>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Masked">
                  <code className="font-mono text-xs">{rawKey.maskedKey}</code>
                </Field>
                <Field label="Issued">
                  <span className="text-xs">{formatDate(rawKey.createdAt)}</span>
                </Field>
              </div>

              <Button
                onClick={() => setRawKey(null)}
                className="w-full"
                variant="outline"
              >
                I&apos;ve saved it — close
              </Button>
            </div>
          )}
        </Modal>

        {/* Revoke confirm */}
        <Modal
          open={confirmRevoke}
          onClose={() => setConfirmRevoke(false)}
          title="Revoke HIS key"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              This will mark the active key as <Badge variant="red">revoked</Badge>{" "}
              and any subsequent push from that key returns 401. To restore
              integration you&apos;ll need to generate a fresh one.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="danger"
                onClick={onRevoke}
                loading={revoking}
                className="flex-1"
              >
                <ShieldOff className="h-4 w-4" />
                Revoke key
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmRevoke(false)}
                disabled={revoking}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </PageWrapper>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
