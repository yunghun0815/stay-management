"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function SelectAddNewRow({
  placeholder = "이름 입력 후 추가",
  onAdd,
}: {
  placeholder?: string;
  onAdd: (name: string, color: string) => Promise<{ error?: string } | void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3182f6");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || pending) return;
    setPending(true);
    const result = await onAdd(name.trim(), color);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setName("");
    setColor("#3182f6");
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
          placeholder={placeholder}
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
