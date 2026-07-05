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
  const { count } = await supabase
    .from("event_categories")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) return;

  await supabase
    .from("event_categories")
    .insert(DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c, owner_id: user.id })));
}

export async function quickCreateEventCategory(
  name: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리 이름을 입력해주세요." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_categories")
    .insert({ name: trimmed, owner_id: user.id })
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return data;
}

export async function updateEventCategory(
  id: string,
  name: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리 이름을 입력해주세요." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("event_categories")
    .update({ name: trimmed })
    .eq("id", id)
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return data;
}

export async function updateEventCategoryColor(id: string, color: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("event_categories")
    .update({ color })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}

export async function deleteEventCategory(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("event_categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return {};
}
