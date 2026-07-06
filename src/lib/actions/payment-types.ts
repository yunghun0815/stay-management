"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import type { TransactionType } from "@/types/supabase";

const DEFAULT_PAYMENT_TYPES: { name: string; type: TransactionType; color: string }[] = [
  { name: "숙박료", type: "income", color: "#2563eb" },
  { name: "추가옵션", type: "income", color: "#0d9488" },
  { name: "청소비", type: "expense", color: "#dc2626" },
  { name: "수수료", type: "expense", color: "#f59e0b" },
];

export async function ensureDefaultPaymentTypes() {
  const { supabase, user } = await requireUser();
  // owner_id+name에 유니크 제약이 있어 동시에 여러 요청이 호출되어도
  // 중복 삽입되지 않는다(이미 있으면 무시).
  await supabase
    .from("payment_types")
    .upsert(
      DEFAULT_PAYMENT_TYPES.map((c) => ({ ...c, owner_id: user.id })),
      { onConflict: "owner_id,name", ignoreDuplicates: true }
    );
}

export async function quickCreatePaymentType(
  name: string,
  type: TransactionType,
  color?: string
): Promise<{ id: string; name: string; color: string | null; type: TransactionType } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "결제구분 이름을 입력해주세요." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("payment_types")
    .insert({ name: trimmed, type, color: color ?? null, owner_id: user.id })
    .select("id, name, color, type")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return data;
}

const LOCKED_PAYMENT_TYPE_NAME = "숙박료";

export async function updatePaymentType(
  id: string,
  name: string,
  color?: string,
  type?: TransactionType
): Promise<{ id: string; name: string; color: string | null; type: TransactionType } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "결제구분 이름을 입력해주세요." };

  const { supabase } = await requireUser();

  const { data: existing } = await supabase
    .from("payment_types")
    .select("name")
    .eq("id", id)
    .single();
  if (existing?.name === LOCKED_PAYMENT_TYPE_NAME) {
    return { error: "숙박료는 수정할 수 없습니다." };
  }

  const { data, error } = await supabase
    .from("payment_types")
    .update({ name: trimmed, ...(color ? { color } : {}), ...(type ? { type } : {}) })
    .eq("id", id)
    .select("id, name, color, type")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return data;
}

export async function deletePaymentType(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();

  const { data: existing } = await supabase
    .from("payment_types")
    .select("name")
    .eq("id", id)
    .single();
  if (existing?.name === LOCKED_PAYMENT_TYPE_NAME) {
    return { error: "숙박료는 삭제할 수 없습니다." };
  }

  const { error } = await supabase.from("payment_types").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return {};
}
