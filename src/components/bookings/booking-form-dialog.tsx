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
import { Plus } from "lucide-react";
import { createBooking, updateBooking, deleteBooking } from "@/lib/actions/bookings";
import { quickCreateChannel, updateChannel, deleteChannel } from "@/lib/actions/channels";
import type { Booking, Channel, Property } from "@/types/supabase";

const ADD_NEW_VALUE = "__add_new__";

export function BookingFormDialog({
  booking,
  properties,
  channels,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  booking?: Booking;
  properties: Property[];
  channels: Channel[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const action = booking ? updateBooking.bind(null, booking.id) : createBooking;
  const [state, formAction, pending] = useActionState(action, null);
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [channelList, setChannelList] = useState(channels);
  const [channelId, setChannelId] = useState(booking?.channel_id ?? "");
  const [, startChannelTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (submittedOnce && !pending && state === null) {
      setOpen(false);
      setSubmittedOnce(false);
    }
  }, [submittedOnce, pending, state]);

  const propertyLabels: Record<string, string> = {};
  for (const p of properties) propertyLabels[p.id] = p.name;
  const channelLabels: Record<string, string> = {};
  for (const c of channelList) channelLabels[c.id] = c.name;

  function handleChannelChange(value: string | null) {
    if (value !== ADD_NEW_VALUE) {
      setChannelId(value ?? "");
      return;
    }
    const name = window.prompt("새 채널 이름을 입력해주세요");
    if (!name?.trim()) return;
    startChannelTransition(async () => {
      const result = await quickCreateChannel(name);
      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      setChannelList((prev) => [...prev, { ...result, owner_id: "", color: null, created_at: "" }]);
      setChannelId(result.id);
    });
  }

  function handleChannelEdit(channel: Channel) {
    const name = window.prompt("채널 이름 수정", channel.name);
    if (!name?.trim() || name === channel.name) return;
    startChannelTransition(async () => {
      const result = await updateChannel(channel.id, name);
      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      setChannelList((prev) => prev.map((c) => (c.id === channel.id ? { ...c, name: result.name } : c)));
    });
  }

  function handleChannelDelete(channel: Channel) {
    if (!window.confirm(`"${channel.name}" 채널을 삭제할까요?`)) return;
    startChannelTransition(async () => {
      const result = await deleteChannel(channel.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setChannelList((prev) => prev.filter((c) => c.id !== channel.id));
      if (channelId === channel.id) setChannelId("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form
          action={(formData) => {
            setSubmittedOnce(true);
            formAction(formData);
          }}
        >
          <DialogHeader>
            <DialogTitle>{booking ? "예약 수정" : "예약 등록"}</DialogTitle>
            <DialogDescription>예약 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="property_id">숙소</Label>
              <Select name="property_id" defaultValue={booking?.property_id}>
                <SelectTrigger id="property_id" className="w-full">
                  <SelectValue placeholder="숙소 선택">
                    {(value: string | null) => (value ? propertyLabels[value] : "숙소 선택")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="guest_name">예약자명</Label>
                <Input id="guest_name" name="guest_name" defaultValue={booking?.guest_name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="guest_phone">연락처</Label>
                <Input id="guest_phone" name="guest_phone" defaultValue={booking?.guest_phone ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="check_in">체크인</Label>
                <Input id="check_in" name="check_in" type="date" defaultValue={booking?.check_in} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="check_out">체크아웃</Label>
                <Input id="check_out" name="check_out" type="date" defaultValue={booking?.check_out} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="guest_count">인원수</Label>
                <Input
                  id="guest_count"
                  name="guest_count"
                  type="number"
                  min={0}
                  defaultValue={booking?.guest_count ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="channel_id">예약채널</Label>
                <Select name="channel_id" value={channelId} onValueChange={handleChannelChange}>
                  <SelectTrigger id="channel_id" className="w-full">
                    <SelectValue placeholder="채널 선택">
                      {(value: string | null) => (value ? channelLabels[value] : "채널 선택")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {channelList.map((channel) => (
                      <ManagedSelectItem
                        key={channel.id}
                        value={channel.id}
                        label={channel.name}
                        color={channel.color}
                        onEdit={() => handleChannelEdit(channel)}
                        onDelete={() => handleChannelDelete(channel)}
                      />
                    ))}
                    <SelectSeparator />
                    <SelectItem value={ADD_NEW_VALUE}>
                      <Plus className="size-3.5" />새 채널 추가
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="total_amount">결제금액</Label>
              <Input
                id="total_amount"
                name="total_amount"
                type="number"
                min={0}
                defaultValue={booking?.total_amount ?? ""}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="memo">메모</Label>
              <Textarea id="memo" name="memo" defaultValue={booking?.memo ?? ""} />
            </div>

            {!booking && (
              <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <input type="checkbox" name="auto_income" defaultChecked className="size-4" />
                결제금액을 숙박료 수입으로 자동 등록
              </label>
            )}

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {booking && (
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={() => {
                  if (!window.confirm(`"${booking.guest_name}" 예약을 삭제할까요?`)) return;
                  setOpen(false);
                  startDeleteTransition(async () => {
                    await deleteBooking(booking.id);
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
