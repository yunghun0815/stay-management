"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/actions/auth";
import { toast } from "sonner";

export function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState(updatePassword, null);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password_confirm">새 비밀번호 확인</Label>
        <Input id="password_confirm" name="password_confirm" type="password" required minLength={6} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  );
}
