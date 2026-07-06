"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { TransactionType } from "@/types/supabase";

export function CategoryAddNewRow({
  onAdd,
}: {
  onAdd: (
    name: string,
    type: TransactionType,
    color: string
  ) => Promise<{ error?: string } | void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("income");
  const [color, setColor] = useState("#3182f6");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || pending) return;
    setPending(true);
    const result = await onAdd(name.trim(), type, color);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setName("");
  }

  return (
    <div
      className="flex flex-col gap-1 border-t px-1.5 py-1.5"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="size-6 shrink-0 cursor-pointer rounded border border-input p-0.5"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 결제구분"
          className="h-7 min-w-0 flex-1 rounded border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          onClick={() => setType((t) => (t === "income" ? "expense" : "income"))}
          className={`h-7 shrink-0 rounded px-2 text-xs font-medium ${
            type === "income"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {type === "income" ? "+수입" : "-지출"}
        </button>
        <button
          type="button"
          disabled={!name.trim() || pending}
          onClick={handleAdd}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {error && <p className="pl-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
