"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";

export type ActionState = { error?: string } | null;

function parsePropertyForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const baseCapacity = formData.get("base_capacity");
  const maxCapacity = formData.get("max_capacity");
  const basePrice = formData.get("base_price");
  const status = String(formData.get("status") ?? "active");

  if (!name) return { error: "숙소 이름을 입력해주세요." } as const;
  if (status !== "active" && status !== "inactive") {
    return { error: "숙소 상태가 올바르지 않습니다." } as const;
  }

  return {
    data: {
      name,
      address: address || null,
      base_capacity: baseCapacity ? Number(baseCapacity) : null,
      max_capacity: maxCapacity ? Number(maxCapacity) : null,
      base_price: basePrice ? Number(basePrice) : null,
      status,
    },
  } as const;
}

export async function createProperty(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePropertyForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("properties")
    .insert({ ...parsed.data, owner_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  revalidatePath("/calendar");
  return null;
}

export async function updateProperty(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePropertyForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("properties").update(parsed.data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  revalidatePath("/calendar");
  return null;
}

export async function deleteProperty(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  revalidatePath("/calendar");
  redirect("/properties");
}
