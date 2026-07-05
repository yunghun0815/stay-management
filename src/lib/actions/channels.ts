"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";

const DEFAULT_CHANNELS: { name: string; color: string }[] = [
  { name: "직접예약", color: "#3182f6" },
  { name: "에어비앤비", color: "#ff5a5f" },
  { name: "야놀자", color: "#0a0a0a" },
  { name: "네이버", color: "#03c75a" },
  { name: "기타", color: "#71717a" },
];

export async function ensureDefaultChannels() {
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("channels")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) return;

  await supabase
    .from("channels")
    .insert(DEFAULT_CHANNELS.map((c) => ({ ...c, owner_id: user.id })));
}

export async function quickCreateChannel(
  name: string
): Promise<{ id: string; name: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "채널 이름을 입력해주세요." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("channels")
    .insert({ name: trimmed, owner_id: user.id })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return data;
}

export async function updateChannel(
  id: string,
  name: string
): Promise<{ id: string; name: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "채널 이름을 입력해주세요." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("channels")
    .update({ name: trimmed })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return data;
}

export async function deleteChannel(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("channels").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return {};
}
