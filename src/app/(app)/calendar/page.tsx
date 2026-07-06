import {
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { ensureDefaultEventCategories } from "@/lib/actions/event-categories";
import { ensureDefaultPaymentTypes } from "@/lib/actions/payment-types";
import type { CalendarEvent } from "@/types/supabase";

type EventWithCategory = CalendarEvent & {
  event_categories: { name: string; color: string | null } | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await ensureDefaultEventCategories();
  await ensureDefaultPaymentTypes();

  const { month: monthParam } = await searchParams;
  const monthDate = monthParam ? parse(monthParam, "yyyy-MM", new Date()) : new Date();

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const gridStartStr = formatISO(gridStart, { representation: "date" });
  const gridEndStr = formatISO(gridEnd, { representation: "date" });

  const prevMonthKey = format(subMonths(monthDate, 1), "yyyy-MM");
  const nextMonthKey = format(subMonths(monthDate, -1), "yyyy-MM");
  const todayKey = format(new Date(), "yyyy-MM");

  const supabase = await createClient();

  const [
    { data: bookings },
    { data: events },
    { data: properties },
    { data: channels },
    { data: eventCategories },
    { data: paymentTypes },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, properties(name), channels(name, color)")
      .lte("check_in", gridEndStr)
      .gte("check_out", gridStartStr),
    supabase
      .from("calendar_events")
      .select("*, event_categories(name, color)")
      .lte("date", gridEndStr)
      .gte("end_date", gridStartStr)
      .returns<EventWithCategory[]>(),
    supabase.from("properties").select("*").order("name"),
    supabase.from("channels").select("*").order("created_at"),
    supabase.from("event_categories").select("*").order("created_at"),
    supabase.from("payment_types").select("*").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">캘린더</h1>
        <p className="text-sm text-muted-foreground">
          예약 기간과 청소/수동 일정을 한눈에 확인하세요.
        </p>
      </div>

      <MonthCalendar
        monthDate={monthDate}
        bookings={bookings ?? []}
        events={events ?? []}
        eventCategories={eventCategories ?? []}
        properties={properties ?? []}
        channels={channels ?? []}
        paymentTypes={paymentTypes ?? []}
        prevMonthHref={`/calendar?month=${prevMonthKey}`}
        nextMonthHref={`/calendar?month=${nextMonthKey}`}
        todayHref={`/calendar?month=${todayKey}`}
      />
    </div>
  );
}
