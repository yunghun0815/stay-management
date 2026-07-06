"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";

const DEFAULT_EVENT_CATEGORIES: { name: string; color: string }[] = [
  { name: "청소", color: "#0d9488" },
  { name: "점검", color: "#9333ea" },
  { name: "기타", color: "#71717a" },
];

export async function ensureDefaultEventCategories() {
  const { supabase, user } = await requireUser();
  // owner_id+name에 유니크 제약이 있어 동시에 여러 요청이 호출되어도
  // 중복 삽입되지 않는다(이미 있으면 무시).
  await supabase
    .from("event_categories")
    .upsert(
      DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c, owner_id: user.id })),
      { onConflict: "owner_id,name", ignoreDuplicates: true }
    );
}

export async function quickCreateEventCategory(
  name: string,
  color?: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리 이름을 입력해주세요." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_categories")
    .insert({ name: trimmed, color: color ?? null, owner_id: user.id })
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return data;
}

export async function updateEventCategory(
  id: string,
  name: string,
  color?: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리 이름을 입력해주세요." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("event_categories")
    .update({ name: trimmed, ...(color ? { color } : {}) })
    .eq("id", id)
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return data;
}

export async function deleteEventCategory(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("event_categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}
