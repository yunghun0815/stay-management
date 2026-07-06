"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm, useAlertDialog } from "@/components/providers/dialog-provider";
import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  action,
  confirmMessage = "정말 삭제하시겠습니까?",
}: {
  action: () => Promise<{ error?: string } | null>;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const alertDialog = useAlertDialog();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({ title: "삭제 확인", description: confirmMessage, destructive: true });
        if (!ok) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) await alertDialog({ description: result.error });
        });
      }}
    >
      <Trash2 className="text-destructive" />
    </Button>
  );
}
