// src/components/phone-numbers/SortablePhoneItem.tsx

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Phone } from "lucide-react";
import { EmergencyContact } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatPhone } from "@/lib/utils";

interface SortablePhoneItemProps {
  contact: EmergencyContact;
  onEdit: (contact: EmergencyContact) => void;
  onDelete: (id: string) => void;
  disableActions?: boolean;
}

export function SortablePhoneItem({ contact, onEdit, onDelete, disableActions }: SortablePhoneItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
    disabled: disableActions,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-4 bg-white border border-brand-border rounded-xl transition-shadow",
        isDragging && "shadow-lg border-brand-blue z-10"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disableActions}
        className={cn(
          "text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none",
          disableActions && "opacity-30 cursor-not-allowed",
        )}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Priority badge */}
      <div className="w-7 h-7 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {contact.priority}
      </div>

      {/* Phone info */}
      <div className="flex-1 flex items-center gap-3">
        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{formatPhone(contact.number)}</p>
          <p className="text-xs text-gray-500">{contact.label}</p>
        </div>
      </div>

      {contact.priority === 1 && (
        <Badge variant="blue">Primary</Badge>
      )}

      {/* Actions */}
      {!disableActions && (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(contact.id)} className="text-brand-red hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      )}
    </div>
  );
}