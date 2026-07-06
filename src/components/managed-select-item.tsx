"use client";

import { useState } from "react";
import { SelectItem } from "@/components/ui/select";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { TransactionType } from "@/types/supabase";

export function ManagedSelectItem({
  value,
  label,
  color,
  type,
  locked = false,
  onSave,
  onDelete,
}: {
  value: string;
  label: string;
  color?: string | null;
  type?: TransactionType;
  locked?: boolean;
  onSave: (name: string, color: string, type?: TransactionType) => Promise<{ error?: string } | void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label);
  const [colorValue, setColorValue] = useState(color ?? "#3182f6");
  const [typeValue, setTypeValue] = useState<TransactionType | undefined>(type);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setName(label);
    setColorValue(color ?? "#3182f6");
    setTypeValue(type);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!name.trim() || pending) return;
    setPending(true);
    const result = await onSave(name.trim(), colorValue, typeValue);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="flex flex-col gap-1 px-1.5 py-1"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => setColorValue(e.target.value)}
            className="size-6 shrink-0 cursor-pointer rounded border border-input p-0.5"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="h-7 min-w-0 flex-1 rounded border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
          />
          {typeValue && (
            <button
              type="button"
              onClick={() => setTypeValue((t) => (t === "income" ? "expense" : "income"))}
              className={`h-7 shrink-0 rounded px-2 text-xs font-medium ${
                typeValue === "income"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              {typeValue === "income" ? "+수입" : "-지출"}
            </button>
          )}
          <button
            type="button"
            disabled={!name.trim() || pending}
            onClick={handleSave}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {error && <p className="pl-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <SelectItem value={value} hideIndicator>
      <div className="flex w-full min-w-0 items-center gap-1">
        {color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        {type && (
          <span
            className={`shrink-0 text-[10px] font-semibold ${
              type === "income"
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {type === "income" ? "+" : "-"}
          </span>
        )}
        <span className="w-24 shrink-0 truncate" title={label}>
          {label}
        </span>
        <span className="ml-auto flex shrink-0 items-center">
          {!locked && (
            <>
              <span
                role="button"
                tabIndex={-1}
                className="shrink-0 rounded p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
              >
                <Pencil className="size-3" />
              </span>
              <span
                role="button"
                tabIndex={-1}
                className="ml-1 shrink-0 rounded p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
            </>
          )}
          <Check className="invisible ml-1 size-3 shrink-0 text-primary group-data-[selected]:visible" />
        </span>
      </div>
    </SelectItem>
  );
}
