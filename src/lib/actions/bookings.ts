"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import type { ActionState } from "@/lib/actions/properties";
import type { SupabaseClient } from "@supabase/supabase-js";

type PaymentLine = { paymentTypeId: string; amount: number };

function parseBookingForm(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestPhone = String(formData.get("guest_phone") ?? "").trim();
  const checkIn = String(formData.get("check_in") ?? "").trim();
  const checkOut = String(formData.get("check_out") ?? "").trim();
  const guestCount = formData.get("guest_count");
  const channelId = String(formData.get("channel_id") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  const paymentTypeIds = formData.getAll("payment_type_id").map(String);
  const amounts = formData.getAll("payment_amount").map(String);
  const paymentLines: PaymentLine[] = [];
  for (let i = 0; i < paymentTypeIds.length; i++) {
    const paymentTypeId = paymentTypeIds[i]?.trim();
    const amount = Number(amounts[i]);
    if (paymentTypeId && amount > 0) paymentLines.push({ paymentTypeId, amount });
  }

  if (!propertyId) return { error: "숙소를 선택해주세요." } as const;
  if (!guestName) return { error: "예약자명을 입력해주세요." } as const;
  if (!checkIn || !checkOut) return { error: "체크인/체크아웃 날짜를 입력해주세요." } as const;
  if (new Date(checkOut) <= new Date(checkIn)) {
    return { error: "체크아웃은 체크인 이후여야 합니다." } as const;
  }

  return {
    data: {
      property_id: propertyId,
      guest_name: guestName,
      guest_phone: guestPhone || null,
      check_in: checkIn,
      check_out: checkOut,
      guest_count: guestCount ? Number(guestCount) : null,
      channel_id: channelId || null,
      memo: memo || null,
    },
    paymentLines,
  } as const;
}

async function getOrCreateCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string,
  name: string,
  type: "income" | "expense"
) {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .eq("type", type)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ name, type, owner_id: ownerId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

async function getOrCreateEventCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string,
  name: string
) {
  const { data: existing } = await supabase
    .from("event_categories")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("event_categories")
    .insert({ name, owner_id: ownerId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

async function savePaymentLines(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string,
  booking: {
    id: string;
    property_id: string;
    guest_name: string;
    check_in: string;
    check_out: string;
  },
  paymentLines: PaymentLine[]
): Promise<number> {
  // 예약 결제구분(payment_types)은 가계부 카테고리와 별개의 목록이다.
  // 이 예약에 연결된 결제 항목/자동 등록 거래를 최신 내용으로 교체한다.
  // 항목은 여러 결제구분으로 나눠 입력하더라도, 가계부에는 합산된
  // "숙박료" 거래 하나로만 등록한다(합계가 마이너스면 금액도 마이너스로).
  await supabase.from("booking_payment_lines").delete().eq("booking_id", booking.id);
  await supabase.from("transactions").delete().eq("booking_id", booking.id);

  if (paymentLines.length === 0) return 0;

  const paymentTypeIds = [...new Set(paymentLines.map((l) => l.paymentTypeId))];
  const { data: paymentTypes } = await supabase
    .from("payment_types")
    .select("id, type")
    .in("id", paymentTypeIds);

  const paymentTypeById = new Map(
    (paymentTypes ?? []).map((p: { id: string; type: "income" | "expense" }) => [p.id, p])
  );

  let totalAmount = 0;
  const lineRows = [];
  for (const line of paymentLines) {
    const paymentType = paymentTypeById.get(line.paymentTypeId);
    if (!paymentType) continue;
    totalAmount += paymentType.type === "income" ? line.amount : -line.amount;
    lineRows.push({
      owner_id: ownerId,
      booking_id: booking.id,
      payment_type_id: line.paymentTypeId,
      amount: line.amount,
    });
  }

  if (lineRows.length > 0) {
    await supabase.from("booking_payment_lines").insert(lineRows);
  }

  if (totalAmount !== 0) {
    const stayCategoryId = await getOrCreateCategory(supabase, ownerId, "숙박료", "income");
    await supabase.from("transactions").insert({
      owner_id: ownerId,
      date: booking.check_in,
      amount: totalAmount,
      type: "income",
      category_id: stayCategoryId,
      property_id: booking.property_id,
      booking_id: booking.id,
      memo: `${booking.check_in}~${booking.check_out} ${booking.guest_name} 예약 숙박료`,
    });
  }

  return totalAmount;
}

export async function createBooking(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseBookingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, user } = await requireUser();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id, property_id, guest_name, check_in, check_out")
    .single();

  if (error) return { error: error.message };

  const cleaningCategoryId = await getOrCreateEventCategory(supabase, user.id, "청소");
  await supabase.from("calendar_events").insert({
    owner_id: user.id,
    title: `${parsed.data.guest_name} 객실 청소`,
    date: parsed.data.check_out,
    end_date: parsed.data.check_out,
    category_id: cleaningCategoryId,
    related_booking_id: booking.id,
  });

  const totalAmount = await savePaymentLines(supabase, user.id, booking, parsed.paymentLines);
  await supabase.from("bookings").update({ total_amount: totalAmount }).eq("id", booking.id);

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return null;
}

export async function updateBooking(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseBookingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, user } = await requireUser();

  const totalAmount = await savePaymentLines(
    supabase,
    user.id,
    {
      id,
      property_id: parsed.data.property_id,
      guest_name: parsed.data.guest_name,
      check_in: parsed.data.check_in,
      check_out: parsed.data.check_out,
    },
    parsed.paymentLines
  );

  const { error } = await supabase
    .from("bookings")
    .update({ ...parsed.data, total_amount: totalAmount })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return null;
}

export async function deleteBooking(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return null;
}

export async function getBookingPaymentLines(
  bookingId: string
): Promise<{ paymentTypeId: string; amount: number }[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("booking_payment_lines")
    .select("payment_type_id, amount")
    .eq("booking_id", bookingId)
    .not("payment_type_id", "is", null);

  return (data ?? []).map((t) => ({ paymentTypeId: t.payment_type_id as string, amount: Number(t.amount) }));
}
