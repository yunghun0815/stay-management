"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type DialogState =
  | ({ mode: "confirm" | "alert" } & ConfirmOptions & { open: boolean })
  | null;

type DialogContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alertDialog: (opts: ConfirmOptions) => Promise<void>;
};

const DialogUtilsContext = createContext<DialogContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(DialogUtilsContext);
  if (!ctx) throw new Error("useConfirm must be used within DialogProvider");
  return ctx.confirm;
}

export function useAlertDialog() {
  const ctx = useContext(DialogUtilsContext);
  if (!ctx) throw new Error("useAlertDialog must be used within DialogProvider");
  return ctx.alertDialog;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const open = useCallback((mode: "confirm" | "alert", opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ mode, ...opts, open: true });
    });
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => open("confirm", opts), [open]);
  const alertDialog = useCallback(
    async (opts: ConfirmOptions) => {
      await open("alert", opts);
    },
    [open]
  );

  function settle(result: boolean) {
    setState((s) => (s ? { ...s, open: false } : s));
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <DialogUtilsContext.Provider value={{ confirm, alertDialog }}>
      {children}
      <Dialog
        open={state?.open ?? false}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{state?.title ?? (state?.mode === "alert" ? "알림" : "확인")}</DialogTitle>
            {state?.description && <DialogDescription>{state.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            {state?.mode === "confirm" && (
              <Button variant="outline" onClick={() => settle(false)}>
                {state?.cancelLabel ?? "취소"}
              </Button>
            )}
            <Button
              variant={state?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {state?.confirmLabel ?? "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogUtilsContext.Provider>
  );
}
