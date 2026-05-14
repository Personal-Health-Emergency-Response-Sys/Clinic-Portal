"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Plus, Save, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SortablePhoneItem } from "@/components/phone-numbers/SortablePhoneItem";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { EmergencyContact } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { ETHIOPIAN_PHONE_REGEX } from "@/lib/constants";
import { fetchPortalClinic, updatePortalPhones } from "@/lib/portalApi";
import { ApiError } from "@/lib/api";

const phoneSchema = z.object({
  number: z.string().regex(ETHIOPIAN_PHONE_REGEX, "Must match +2519… or +2517…"),
  label: z.string().max(60).optional(),
});

type PhoneForm = z.infer<typeof phoneSchema>;

function toContacts(phones: { number: string; priority: number; label?: string }[]): EmergencyContact[] {
  return phones.map((p, i) => ({
    id: `p-${p.number}-${i}`,
    number: p.number,
    label: p.label?.trim() || "Line",
    priority: p.priority,
  }));
}

export default function PhoneNumbersPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "clinic_admin";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
  });

  async function loadPhones() {
    setLoadError("");
    setLoading(true);
    try {
      const clinic = await fetchPortalClinic();
      const sorted = [...(clinic.phones ?? [])].sort((a, b) => a.priority - b.priority);
      setContacts(toContacts(sorted));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not load phone numbers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadPhones();
    });
  }, []);

  function openAdd() {
    if (!isAdmin) return;
    setEditing(null);
    reset({ number: "", label: "" });
    setModalOpen(true);
  }

  function openEdit(contact: EmergencyContact) {
    if (!isAdmin) return;
    setEditing(contact);
    reset({ number: contact.number, label: contact.label });
    setModalOpen(true);
  }

  function onSubmit(data: PhoneForm) {
    if (!isAdmin) return;
    if (editing) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editing.id ? { ...c, number: data.number, label: data.label?.trim() || "Line" } : c)),
      );
    } else {
      if (contacts.length >= 5) {
        toast.error("You can store at most five numbers.");
        return;
      }
      const next: EmergencyContact = {
        id: `tmp-${data.number}-${contacts.length}`,
        number: data.number,
        label: data.label?.trim() || "Line",
        priority: contacts.length + 1,
      };
      setContacts((prev) => [...prev, next]);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    if (!isAdmin) return;
    setContacts((prev) =>
      prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, priority: i + 1 })),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!isAdmin) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setContacts((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === active.id);
      const newIdx = prev.findIndex((c) => c.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx).map((c, i) => ({ ...c, priority: i + 1 }));
    });
  }

  async function handleSave() {
    if (!isAdmin) return;
    if (contacts.length < 1) {
      toast.error("At least one phone number is required.");
      return;
    }
    setSaving(true);
    try {
      const phones = contacts.map((c) => ({
        number: c.number,
        priority: c.priority,
        ...(c.label ? { label: c.label } : {}),
      }));
      await updatePortalPhones(phones);
      toast.success("Phone numbers saved.");
      await loadPhones();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <Header
        title="Emergency phone numbers"
        subtitle="Order matches how the app will try your lines during SOS"
        user={user}
      />
      <PageWrapper>
        <div className="max-w-2xl space-y-5">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </div>
          )}

          {!isAdmin && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              Only clinic administrators can edit phone numbers. You can still review the list below.
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="h-4 w-4 text-brand-blue flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Priority matters.</strong> The mobile app calls numbers from top to bottom. Each number must
              match <code className="text-xs bg-white/60 px-1 rounded">+251[7|9]XXXXXXXX</code> exactly as stored on
              the backend.
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Emergency contacts ({contacts.length})</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={openAdd} disabled={contacts.length >= 5}>
                  <Plus className="h-3.5 w-3.5" />
                  Add number
                </Button>
              )}
            </CardHeader>

            {loading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No emergency numbers on file.</p>
                {isAdmin && (
                  <p className="text-xs mt-1">Add at least one number so the backend can validate your clinic.</p>
                )}
              </div>
            ) : isAdmin ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <SortablePhoneItem
                        key={contact.id}
                        contact={contact}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        disableActions={false}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-4 bg-white border border-brand-border rounded-xl"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {contact.priority}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{contact.number}</p>
                      <p className="text-xs text-gray-500">{contact.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <Button size="lg" onClick={handleSave} loading={saving}>
                <Save className="h-4 w-4" />
                Save to server
              </Button>
            </div>
          )}
        </div>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? "Edit phone number" : "Add emergency number"}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Phone number"
              placeholder="+251911234567"
              hint="Ethiopian mobile format"
              error={errors.number?.message}
              {...register("number")}
            />
            <Input
              label="Label (optional)"
              placeholder="e.g. Emergency line, Reception"
              error={errors.label?.message}
              {...register("label")}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1">
                {editing ? "Update" : "Add number"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </PageWrapper>
    </>
  );
}
