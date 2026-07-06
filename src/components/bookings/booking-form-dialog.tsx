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
import { PaymentLinesEditor } from "@/components/bookings/payment-lines-editor";
import { createBooking, updateBooking, deleteBooking } from "@/lib/actions/bookings";
import { quickCreateChannel, updateChannel, deleteChannel } from "@/lib/actions/channels";
import { useConfirm, useAlertDialog } from "@/components/providers/dialog-provider";
import type { Booking, Channel, PaymentType, Property } from "@/types/supabase";

export function BookingFormDialog({
  booking,
  properties,
  channels,
  paymentTypes,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  booking?: Booking;
  properties: Property[];
  channels: Channel[];
  paymentTypes: PaymentType[];
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
  const confirm = useConfirm();
  const alertDialog = useAlertDialog();

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

  async function handleChannelAdd(name: string, color: string) {
    const result = await quickCreateChannel(name, color);
    if ("error" in result) return result;
    setChannelList((prev) => [...prev, { ...result, owner_id: "", created_at: "" }]);
    setChannelId(result.id);
  }

  async function handleChannelSave(channel: Channel, name: string, color: string) {
    const result = await updateChannel(channel.id, name, color);
    if ("error" in result) return result;
    setChannelList((prev) =>
      prev.map((c) => (c.id === channel.id ? { ...c, name: result.name, color: result.color } : c))
    );
  }

  async function handleChannelDelete(channel: Channel) {
    const ok = await confirm({
      title: "채널 삭제",
      description: `"${channel.name}" 채널을 삭제할까요?`,
      destructive: true,
    });
    if (!ok) return;
    startChannelTransition(async () => {
      const result = await deleteChannel(channel.id);
      if (result.error) {
        await alertDialog({ description: result.error });
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
                <Input
                  id="check_in"
                  name="check_in"
                  type="date"
                  max="9999-12-31"
                  defaultValue={booking?.check_in}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="check_out">체크아웃</Label>
                <Input
                  id="check_out"
                  name="check_out"
                  type="date"
                  max="9999-12-31"
                  defaultValue={booking?.check_out}
                  required
                />
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
                <Select
                  name="channel_id"
                  value={channelId}
                  onValueChange={(value) => setChannelId(value ?? "")}
                >
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
                        onSave={(name, color) => handleChannelSave(channel, name, color)}
                        onDelete={() => handleChannelDelete(channel)}
                      />
                    ))}
                    <SelectSeparator />
                    <SelectAddNewRow placeholder="새 채널 이름" onAdd={handleChannelAdd} />
                  </SelectContent>
                </Select>
              </div>
            </div>

            <PaymentLinesEditor paymentTypes={paymentTypes} bookingId={booking?.id} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="memo">메모</Label>
              <Textarea id="memo" name="memo" defaultValue={booking?.memo ?? ""} />
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {booking && (
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={async () => {
                  const ok = await confirm({
                    title: "예약 삭제",
                    description: `"${booking.guest_name}" 예약을 삭제할까요?`,
                    destructive: true,
                  });
                  if (!ok) return;
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
