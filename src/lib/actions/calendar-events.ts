"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import type { ActionState } from "@/lib/actions/properties";

function parseEventForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim() || date;
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!title) return { error: "제목을 입력해주세요." } as const;
  if (!date) return { error: "시작일을 입력해주세요." } as const;
  if (endDate < date) return { error: "종료일은 시작일 이후여야 합니다." } as const;

  return {
    data: {
      title,
      date,
      end_date: endDate,
      category_id: categoryId || null,
      memo: memo || null,
    },
  } as const;
}

export async function createCalendarEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("calendar_events")
    .insert({ ...parsed.data, owner_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return null;
}

export async function updateCalendarEvent(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("calendar_events").update(parsed.data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return null;
}

export async function toggleCalendarEventCompletion(id: string, isCompleted: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("calendar_events")
    .update({ is_completed: isCompleted })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return null;
}

export async function deleteCalendarEvent(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return null;
}
