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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManagedSelectItem } from "@/components/managed-select-item";
import { SelectAddNewRow } from "@/components/select-add-new-row";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar-events";
import {
  quickCreateEventCategory,
  updateEventCategory,
  deleteEventCategory,
} from "@/lib/actions/event-categories";
import { useConfirm, useAlertDialog } from "@/components/providers/dialog-provider";
import type { CalendarEvent, EventCategory } from "@/types/supabase";

export function EventFormDialog({
  event,
  categories,
  defaultStart,
  defaultEnd,
  trigger,
  open,
  onOpenChange,
}: {
  event?: CalendarEvent;
  categories: EventCategory[];
  defaultStart?: string;
  defaultEnd?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const action = event ? updateCalendarEvent.bind(null, event.id) : createCalendarEvent;
  const [state, formAction, pending] = useActionState(action, null);
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [categoryList, setCategoryList] = useState(categories);
  const [categoryId, setCategoryId] = useState(event?.category_id ?? "");
  const [, startCategoryTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const confirm = useConfirm();
  const alertDialog = useAlertDialog();

  useEffect(() => {
    if (submittedOnce && !pending && state === null) {
      setOpen(false);
      setSubmittedOnce(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedOnce, pending, state]);

  useEffect(() => {
    setCategoryList(categories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  async function handleCategoryAdd(name: string, color: string) {
    const result = await quickCreateEventCategory(name, color);
    if ("error" in result) return result;
    setCategoryList((prev) => [...prev, { ...result, owner_id: "", created_at: "" }]);
    setCategoryId(result.id);
  }

  async function handleCategorySave(category: EventCategory, name: string, color: string) {
    const result = await updateEventCategory(category.id, name, color);
    if ("error" in result) return result;
    setCategoryList((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, name: result.name, color: result.color } : c))
    );
  }

  async function handleCategoryDelete(category: EventCategory) {
    const ok = await confirm({
      title: "카테고리 삭제",
      description: `"${category.name}" 카테고리를 삭제할까요?`,
      destructive: true,
    });
    if (!ok) return;
    startCategoryTransition(async () => {
      const result = await deleteEventCategory(category.id);
      if (result.error) {
        await alertDialog({ description: result.error });
        return;
      }
      setCategoryList((prev) => prev.filter((c) => c.id !== category.id));
      if (categoryId === category.id) setCategoryId("");
    });
  }

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent>
        <form
          action={(formData) => {
            setSubmittedOnce(true);
            formAction(formData);
          }}
        >
          <DialogHeader>
            <DialogTitle>{event ? "일정 수정" : "일정 등록"}</DialogTitle>
            <DialogDescription>수리, 방문 점검 등 수동 일정을 등록하세요.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" name="title" defaultValue={event?.title} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">시작일</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  max="9999-12-31"
                  defaultValue={event?.date ?? defaultStart}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end_date">종료일</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  max="9999-12-31"
                  defaultValue={event?.end_date ?? defaultEnd ?? defaultStart}
                  required
                />
              </div>
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
                  {categoryList.map((c) => (
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
              <Label htmlFor="memo">메모</Label>
              <Textarea id="memo" name="memo" defaultValue={event?.memo ?? ""} />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {event && (
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={async () => {
                  const ok = await confirm({
                    title: "일정 삭제",
                    description: `"${event.title}" 일정을 삭제할까요?`,
                    destructive: true,
                  });
                  if (!ok) return;
                  setOpen(false);
                  startDeleteTransition(async () => {
                    await deleteCalendarEvent(event.id);
                  });
                }}
              >
                삭제
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
