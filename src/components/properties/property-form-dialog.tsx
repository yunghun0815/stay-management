"use client";

import { useActionState, useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProperty, updateProperty } from "@/lib/actions/properties";
import type { Property } from "@/types/supabase";

export function PropertyFormDialog({
  property,
  trigger,
}: {
  property?: Property;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = property
    ? updateProperty.bind(null, property.id)
    : createProperty;
  const [state, formAction, pending] = useActionState(action, null);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  useEffect(() => {
    if (submittedOnce && !pending && state === null) {
      setOpen(false);
      setSubmittedOnce(false);
    }
  }, [submittedOnce, pending, state]);

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
            <DialogTitle>{property ? "숙소 수정" : "숙소 등록"}</DialogTitle>
            <DialogDescription>숙소 기본 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" defaultValue={property?.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">주소</Label>
              <Input id="address" name="address" defaultValue={property?.address ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="base_capacity">기준인원</Label>
                <Input
                  id="base_capacity"
                  name="base_capacity"
                  type="number"
                  min={0}
                  defaultValue={property?.base_capacity ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="max_capacity">최대인원</Label>
                <Input
                  id="max_capacity"
                  name="max_capacity"
                  type="number"
                  min={0}
                  defaultValue={property?.max_capacity ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="base_price">기본 가격</Label>
              <Input
                id="base_price"
                name="base_price"
                type="number"
                min={0}
                defaultValue={property?.base_price ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">상태</Label>
              <Select name="status" defaultValue={property?.status ?? "active"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>
                    {(value: string) => (value === "inactive" ? "비활성" : "사용중")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">사용중</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
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
