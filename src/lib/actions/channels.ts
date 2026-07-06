"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";

const DEFAULT_CHANNELS: { name: string; color: string }[] = [
  { name: "직접예약", color: "#3182f6" },
  { name: "에어비앤비", color: "#ff5a5f" },
  { name: "삼삼엠투", color: "#0a0a0a" },
  { name: "리브애니웨어", color: "#03c75a" },
  { name: "기타", color: "#71717a" },
];

export async function ensureDefaultChannels() {
  const { supabase, user } = await requireUser();
  // owner_id+name에 유니크 제약이 있어 동시에 여러 요청이 호출되어도
  // 중복 삽입되지 않는다(이미 있으면 무시).
  await supabase
    .from("channels")
    .upsert(
      DEFAULT_CHANNELS.map((c) => ({ ...c, owner_id: user.id })),
      { onConflict: "owner_id,name", ignoreDuplicates: true }
    );
}

export async function quickCreateChannel(
  name: string,
  color?: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "채널 이름을 입력해주세요." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("channels")
    .insert({ name: trimmed, color: color ?? null, owner_id: user.id })
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return data;
}

export async function updateChannel(
  id: string,
  name: string,
  color?: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "채널 이름을 입력해주세요." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("channels")
    .update({ name: trimmed, ...(color ? { color } : {}) })
    .eq("id", id)
    .select("id, name, color")
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
