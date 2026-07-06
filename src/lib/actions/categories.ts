"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import type { TransactionType } from "@/types/supabase";

const DEFAULT_CATEGORIES: { name: string; type: TransactionType; color: string }[] = [
  { name: "숙박료", type: "income", color: "#2563eb" },
  { name: "청소비(고객부담)", type: "income", color: "#0ea5e9" },
  { name: "추가옵션", type: "income", color: "#0d9488" },
  { name: "기타수입", type: "income", color: "#4f46e5" },
  { name: "청소/린넨비", type: "expense", color: "#dc2626" },
  { name: "소모품(어메니티)", type: "expense", color: "#ea580c" },
  { name: "플랫폼 수수료", type: "expense", color: "#f59e0b" },
  { name: "광고비", type: "expense", color: "#db2777" },
  { name: "공과금", type: "expense", color: "#9333ea" },
  { name: "수리/유지보수", type: "expense", color: "#b45309" },
  { name: "세금", type: "expense", color: "#78716c" },
  { name: "대출이자", type: "expense", color: "#57534e" },
  { name: "기타지출", type: "expense", color: "#71717a" },
];

export async function ensureDefaultCategories() {
  const { supabase, user } = await requireUser();
  // owner_id+name+type에 유니크 제약이 있어 동시에 여러 요청이 호출되어도
  // 중복 삽입되지 않는다(이미 있으면 무시).
  await supabase
    .from("categories")
    .upsert(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, owner_id: user.id })),
      { onConflict: "owner_id,name,type", ignoreDuplicates: true }
    );
}

export async function quickCreateCategory(
  name: string,
  type: TransactionType,
  color?: string
): Promise<{ id: string; name: string; color: string | null } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리 이름을 입력해주세요." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: trimmed, type, color: color ?? null, owner_id: user.id })
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/ledger");
  return data;
}

export async function updateCategory(
  id: string,
  name: string,
  color?: string,
  type?: TransactionType
): Promise<{ id: string; name: string; color: string | null; type: TransactionType } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리 이름을 입력해주세요." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: trimmed, ...(color ? { color } : {}), ...(type ? { type } : {}) })
    .eq("id", id)
    .select("id, name, color, type")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return data;
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/ledger");
  return {};
}
