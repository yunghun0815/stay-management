"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { ManagedSelectItem } from "@/components/managed-select-item";
import { CategoryAddNewRow } from "@/components/bookings/category-add-new-row";
import { useConfirm, useAlertDialog } from "@/components/providers/dialog-provider";
import {
  quickCreatePaymentType,
  updatePaymentType,
  deletePaymentType,
} from "@/lib/actions/payment-types";
import { getBookingPaymentLines } from "@/lib/actions/bookings";
import { Plus, Trash2 } from "lucide-react";
import type { PaymentType, TransactionType } from "@/types/supabase";

type Line = { key: string; paymentTypeId: string; amount: string };
let lineSeq = 0;
function nextKey() {
  lineSeq += 1;
  return `line-${lineSeq}`;
}

export function PaymentLinesEditor({
  paymentTypes,
  bookingId,
}: {
  paymentTypes: PaymentType[];
  bookingId?: string;
}) {
  const [paymentTypeList, setPaymentTypeList] = useState(paymentTypes);
  const [lines, setLines] = useState<Line[]>([{ key: nextKey(), paymentTypeId: "", amount: "" }]);
  const confirm = useConfirm();
  const alertDialog = useAlertDialog();

  useEffect(() => {
    if (!bookingId) return;
    getBookingPaymentLines(bookingId).then((existing) => {
      if (existing.length === 0) return;
      setLines(
        existing.map((l) => ({ key: nextKey(), paymentTypeId: l.paymentTypeId, amount: String(l.amount) }))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  function addLine() {
    setLines((prev) => [...prev, { key: nextKey(), paymentTypeId: "", amount: "" }]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function handlePaymentTypeAdd(name: string, type: TransactionType, color: string) {
    const result = await quickCreatePaymentType(name, type, color);
    if ("error" in result) return result;
    setPaymentTypeList((prev) => [...prev, { ...result, owner_id: "", created_at: "" }]);
  }

  async function handlePaymentTypeSave(
    paymentType: PaymentType,
    name: string,
    color: string,
    type?: TransactionType
  ) {
    const result = await updatePaymentType(paymentType.id, name, color, type);
    if ("error" in result) return result;
    setPaymentTypeList((prev) =>
      prev.map((p) =>
        p.id === paymentType.id ? { ...p, name: result.name, color: result.color, type: result.type } : p
      )
    );
  }

  async function handlePaymentTypeDelete(paymentType: PaymentType) {
    const ok = await confirm({
      title: "결제구분 삭제",
      description: `"${paymentType.name}" 결제구분을 삭제할까요?`,
      destructive: true,
    });
    if (!ok) return;
    const result = await deletePaymentType(paymentType.id);
    if (result.error) {
      await alertDialog({ description: result.error });
      return;
    }
    setPaymentTypeList((prev) => prev.filter((p) => p.id !== paymentType.id));
    setLines((prev) =>
      prev.map((l) => (l.paymentTypeId === paymentType.id ? { ...l, paymentTypeId: "" } : l))
    );
  }

  const total = lines.reduce((sum, l) => {
    const paymentType = paymentTypeList.find((p) => p.id === l.paymentTypeId);
    const amount = Number(l.amount) || 0;
    if (!paymentType) return sum;
    return sum + (paymentType.type === "income" ? amount : -amount);
  }, 0);

  return (
    <div className="flex flex-col gap-2">
      <Label>금액</Label>
      <div className="flex flex-col gap-2">
        {lines.map((line) => {
          const selectedPaymentType = paymentTypeList.find((p) => p.id === line.paymentTypeId);
          return (
            <div key={line.key} className="flex items-center gap-2">
              <input type="hidden" name="payment_type_id" value={line.paymentTypeId} readOnly />
              <input type="hidden" name="payment_amount" value={line.amount} readOnly />
              <Select
                value={line.paymentTypeId}
                onValueChange={(v) => updateLine(line.key, { paymentTypeId: v ?? "" })}
              >
                <SelectTrigger className="w-28 shrink-0" title={selectedPaymentType?.name}>
                  <SelectValue placeholder="결제구분">
                    {() => selectedPaymentType?.name ?? "결제구분"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {paymentTypeList.map((p) => (
                    <ManagedSelectItem
                      key={p.id}
                      value={p.id}
                      label={p.name}
                      color={p.color}
                      type={p.type}
                      locked={p.name === "숙박료"}
                      onSave={(name, color, type) => handlePaymentTypeSave(p, name, color, type)}
                      onDelete={() => handlePaymentTypeDelete(p)}
                    />
                  ))}
                  <SelectSeparator />
                  <CategoryAddNewRow onAdd={handlePaymentTypeAdd} />
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={line.amount}
                onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                placeholder="금액"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={lines.length <= 1}
                onClick={() => removeLine(line.key)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addLine} className="self-start">
        <Plus />
        항목 추가
      </Button>
      <p className="text-right text-sm text-muted-foreground">
        합계 {total.toLocaleString()}원
      </p>
    </div>
  );
}
