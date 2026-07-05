"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import type { ActionState } from "@/lib/actions/properties";
import type { SupabaseClient } from "@supabase/supabase-js";

function parseBookingForm(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestPhone = String(formData.get("guest_phone") ?? "").trim();
  const checkIn = String(formData.get("check_in") ?? "").trim();
  const checkOut = String(formData.get("check_out") ?? "").trim();
  const guestCount = formData.get("guest_count");
  const channelId = String(formData.get("channel_id") ?? "").trim();
  const totalAmount = formData.get("total_amount");
  const memo = String(formData.get("memo") ?? "").trim();
  const autoIncome = formData.get("auto_income") === "on";

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
      total_amount: totalAmount ? Number(totalAmount) : null,
      memo: memo || null,
    },
    autoIncome,
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
    .select("id")
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

  if (parsed.autoIncome && parsed.data.total_amount) {
    const categoryId = await getOrCreateCategory(supabase, user.id, "숙박료", "income");
    await supabase.from("transactions").insert({
      owner_id: user.id,
      date: parsed.data.check_in,
      amount: parsed.data.total_amount,
      type: "income",
      category_id: categoryId,
      property_id: parsed.data.property_id,
      booking_id: booking.id,
      memo: `${parsed.data.guest_name} 예약 숙박료`,
    });
  }

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

  const { supabase } = await requireUser();
  const { error } = await supabase.from("bookings").update(parsed.data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/calendar");
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
