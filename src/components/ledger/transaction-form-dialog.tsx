"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManagedSelectItem } from "@/components/managed-select-item";
import { SelectAddNewRow } from "@/components/select-add-new-row";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { quickCreateCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";
import { useConfirm, useAlertDialog } from "@/components/providers/dialog-provider";
import type { Category, Property, Transaction } from "@/types/supabase";

export function TransactionFormDialog({
  transaction,
  categories,
  properties,
  trigger,
}: {
  transaction?: Transaction;
  categories: Category[];
  properties: Property[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">(transaction?.type ?? "income");
  const [categoryList, setCategoryList] = useState(categories);
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [, startCategoryTransition] = useTransition();
  const confirm = useConfirm();
  const alertDialog = useAlertDialog();

  const action = transaction
    ? updateTransaction.bind(null, transaction.id)
    : createTransaction;
  const [state, formAction, pending] = useActionState(action, null);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  useEffect(() => {
    if (submittedOnce && !pending && state === null) {
      setOpen(false);
      setSubmittedOnce(false);
    }
  }, [submittedOnce, pending, state]);

  const filteredCategories = categoryList.filter((c) => c.type === type);

  async function handleCategoryAdd(name: string, color: string) {
    const result = await quickCreateCategory(name, type, color);
    if ("error" in result) return result;
    setCategoryList((prev) => [...prev, { ...result, owner_id: "", type, created_at: "" }]);
    setCategoryId(result.id);
  }

  async function handleCategorySave(category: Category, name: string, color: string) {
    const result = await updateCategory(category.id, name, color);
    if ("error" in result) return result;
    setCategoryList((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, name: result.name, color: result.color } : c))
    );
  }

  async function handleCategoryDelete(category: Category) {
    const ok = await confirm({
      title: "카테고리 삭제",
      description: `"${category.name}" 카테고리를 삭제할까요?`,
      destructive: true,
    });
    if (!ok) return;
    startCategoryTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.error) {
        await alertDialog({ description: result.error });
        return;
      }
      setCategoryList((prev) => prev.filter((c) => c.id !== category.id));
      if (categoryId === category.id) setCategoryId("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form
          action={(formData) => {
            setSubmittedOnce(true);
            formAction(formData);
          }}
        >
          <DialogHeader>
            <DialogTitle>{transaction ? "거래 수정" : "거래 등록"}</DialogTitle>
            <DialogDescription>수입/지출 거래 내역을 입력해주세요.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">날짜</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  max="9999-12-31"
                  defaultValue={transaction?.date}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">금액</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={0}
                  defaultValue={transaction?.amount ?? ""}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="type">구분</Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => {
                  const nextType = v as "income" | "expense";
                  setType(nextType);
                  setCategoryId((prev) => {
                    const current = categoryList.find((c) => c.id === prev);
                    return current && current.type === nextType ? prev : "";
                  });
                }}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue>{(value: string) => (value === "expense" ? "지출" : "수입")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">수입</SelectItem>
                  <SelectItem value="expense">지출</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="category_id">카테고리</Label>
              <Select
                name="category_id"
                value={categoryId}
                onValueChange={(value) => setCategoryId(value ?? "")}
              >
                <SelectTrigger id="category_id" className="w-full">
                  <SelectValue placeholder="카테고리 선택">
                    {(value: string | null) =>
                      value
                        ? (categoryList.find((c) => c.id === value)?.name ?? value)
                        : "카테고리 선택"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <ManagedSelectItem
                      key={c.id}
                      value={c.id}
                      label={c.name}
                      color={c.color}
                      onSave={(name, color) => handleCategorySave(c, name, color)}
                      onDelete={() => handleCategoryDelete(c)}
                    />
                  ))}
                  <SelectSeparator />
                  <SelectAddNewRow placeholder="새 카테고리 이름" onAdd={handleCategoryAdd} />
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="property_id">숙소</Label>
              <Select name="property_id" defaultValue={transaction?.property_id ?? undefined}>
                <SelectTrigger id="property_id" className="w-full">
                  <SelectValue placeholder="숙소 선택">
                    {(value: string | null) =>
                      value ? (properties.find((p) => p.id === value)?.name ?? value) : "숙소 선택"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="memo">메모</Label>
              <Textarea id="memo" name="memo" defaultValue={transaction?.memo ?? ""} />
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
