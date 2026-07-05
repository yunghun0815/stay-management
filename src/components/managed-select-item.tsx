"use client";

import { SelectItem } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

export function ManagedSelectItem({
  value,
  label,
  color,
  onEdit,
  onDelete,
}: {
  value: string;
  label: string;
  color?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SelectItem value={value}>
      <div className="flex w-full min-w-0 items-center gap-1.5">
        {color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="flex-1 truncate">{label}</span>
        <span
          role="button"
          tabIndex={-1}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="size-3" />
        </span>
        <span
          role="button"
          tabIndex={-1}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3" />
        </span>
      </div>
    </SelectItem>
  );
}
