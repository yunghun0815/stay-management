"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  action,
  confirmMessage = "정말 삭제하시겠습니까?",
}: {
  action: () => Promise<{ error?: string } | null>;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      <Trash2 className="text-destructive" />
    </Button>
  );
}
