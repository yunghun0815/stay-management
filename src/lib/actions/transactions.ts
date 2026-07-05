"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import type { ActionState } from "@/lib/actions/properties";
import type { TransactionType } from "@/types/supabase";

function parseTransactionForm(formData: FormData) {
  const date = String(formData.get("date") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const type = String(formData.get("type") ?? "");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const propertyId = String(formData.get("property_id") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!date) return { error: "날짜를 입력해주세요." } as const;
  if (!amount || amount <= 0) return { error: "금액을 올바르게 입력해주세요." } as const;
  if (type !== "income" && type !== "expense") {
    return { error: "구분을 선택해주세요." } as const;
  }

  return {
    data: {
      date,
      amount,
      type: type as TransactionType,
      category_id: categoryId || null,
      property_id: propertyId || null,
      memo: memo || null,
    },
  } as const;
}

export async function createTransaction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("transactions")
    .insert({ ...parsed.data, owner_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/ledger/report");
  revalidatePath("/dashboard");
  return null;
}

export async function updateTransaction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").update(parsed.data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/ledger/report");
  revalidatePath("/dashboard");
  return null;
}

export async function deleteTransaction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/ledger/report");
  revalidatePath("/dashboard");
  return null;
}
