"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookingFormDialog } from "@/components/bookings/booking-form-dialog";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { toggleCalendarEventCompletion } from "@/lib/actions/calendar-events";
import type { Booking, CalendarEvent, Channel, EventCategory, PaymentType, Property } from "@/types/supabase";

type BookingWithRelations = Booking & {
  properties: { name: string } | null;
  channels: { name: string; color: string | null } | null;
};

type EventWithCategory = CalendarEvent & {
  event_categories: { name: string; color: string | null } | null;
};

const DEFAULT_EVENT_COLOR = "#8b95a1";

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function assignLanes<T extends { id: string; start: string; end: string }>(
  items: T[]
): { laneOf: Map<string, number>; maxLanes: number } {
  const sorted = [...items].sort((a, b) => {
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    return b.end < a.end ? -1 : 1;
  });

  const laneLastDay: string[] = [];
  const laneOf = new Map<string, number>();
  for (const item of sorted) {
    let lane = laneLastDay.findIndex((last) => last < item.start);
    if (lane === -1) {
      lane = laneLastDay.length;
      laneLastDay.push(item.end);
    } else {
      laneLastDay[lane] = item.end;
    }
    laneOf.set(item.id, lane);
  }
  return { laneOf, maxLanes: laneLastDay.length };
}

export function MonthCalendar({
  monthDate,
  bookings,
  events,
  eventCategories,
  properties,
  channels,
  paymentTypes,
  prevMonthHref,
  nextMonthHref,
  todayHref,
}: {
  monthDate: Date;
  bookings: BookingWithRelations[];
  events: EventWithCategory[];
  eventCategories: EventCategory[];
  properties: Property[];
  channels: Channel[];
  paymentTypes: PaymentType[];
  prevMonthHref: string;
  nextMonthHref: string;
  todayHref: string;
}) {
  const [, startTransition] = useTransition();

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    return chunk(days, 7);
  }, [monthDate]);

  // 빈 셀 클릭/드래그로 일정 등록
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [dragHover, setDragHover] = useState<string | null>(null);
  const [createRange, setCreateRange] = useState<{ start: string; end: string } | null>(null);
  const isPointerDownRef = useRef(false);
  const dragAnchorRef = useRef<string | null>(null);
  const dragHoverRef = useRef<string | null>(null);

  useEffect(() => {
    function reset() {
      isPointerDownRef.current = false;
      dragAnchorRef.current = null;
      dragHoverRef.current = null;
      setDragAnchor(null);
      setDragHover(null);
    }
    function handlePointerUp() {
      if (!isPointerDownRef.current || !dragAnchorRef.current) return;
      const anchor = dragAnchorRef.current;
      const end = dragHoverRef.current ?? anchor;
      const start = anchor < end ? anchor : end;
      const finalEnd = anchor < end ? end : anchor;
      reset();
      setCreateRange({ start, end: finalEnd });
    }
    // 모바일 등에서 다이얼로그가 열리며 제스처가 중단되면 pointerup 대신
    // pointercancel이 발생해 상태가 남아있을 수 있으므로 함께 초기화한다.
    function handlePointerCancel() {
      reset();
    }
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, []);

  function handleDayPointerDown(e: React.PointerEvent<HTMLDivElement>, dayStr: string) {
    // 예약/일정 버튼 클릭이 실수로 새 일정 등록 드래그로 이어지지 않도록 방어.
    if (e.target instanceof Element && e.target.closest("button")) return;
    // 예약/일정 수정 다이얼로그는 Portal로 렌더링되어 실제 DOM상으로는 날짜 셀
    // 밖에 있지만, React의 합성 이벤트는 DOM이 아닌 컴포넌트 트리를 따라
    // 버블링되기 때문에 다이얼로그 내부(입력창, 메모 등 버튼이 아닌 요소)를
    // 클릭해도 이 핸들러까지 전파된다. 다이얼로그가 열려 있는 동안에는 실제
    // DOM 상태를 직접 확인해 드래그 생성 자체를 시작하지 않도록 막는다.
    if (typeof document !== "undefined" && document.querySelector('[data-slot="dialog-content"]')) {
      return;
    }
    isPointerDownRef.current = true;
    dragAnchorRef.current = dayStr;
    dragHoverRef.current = dayStr;
    setDragAnchor(dayStr);
    setDragHover(dayStr);
  }

  function handleDayPointerEnter(dayStr: string) {
    if (!isPointerDownRef.current) return;
    dragHoverRef.current = dayStr;
    setDragHover(dayStr);
  }

  const dragRangeSet = useMemo(() => {
    if (!dragAnchor || !dragHover) return null;
    const start = dragAnchor < dragHover ? dragAnchor : dragHover;
    const end = dragAnchor < dragHover ? dragHover : dragAnchor;
    return { start, end };
  }, [dragAnchor, dragHover]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(monthDate, "yyyy년 M월")}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={todayHref} />}>
            오늘
          </Button>
          <Button
            variant="outline"
            size="icon"
            nativeButton={false}
            render={<Link href={prevMonthHref} />}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            nativeButton={false}
            render={<Link href={nextMonthHref} />}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        빈 칸을 클릭하면 일정을 등록할 수 있어요. 여러 날을 누른 채로 끌면 기간을 바로 지정할 수
        있습니다.
      </p>

      <div className="overflow-hidden rounded-xl border select-none">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => {
          const weekStartStr = format(week[0], "yyyy-MM-dd");
          const weekEndStr = format(week[6], "yyyy-MM-dd");

          const overlappingBookings = bookings.filter(
            (b) => b.check_in <= weekEndStr && b.check_out >= weekStartStr
          );
          const { laneOf: bookingLaneOf, maxLanes: maxBookingLanes } = assignLanes(
            overlappingBookings.map((b) => ({ id: b.id, start: b.check_in, end: b.check_out }))
          );

          const overlappingEvents = events.filter(
            (e) => e.date <= weekEndStr && e.end_date >= weekStartStr
          );
          const { laneOf: eventLaneOf, maxLanes: maxEventLanes } = assignLanes(
            overlappingEvents.map((e) => ({ id: e.id, start: e.date, end: e.end_date }))
          );

          return (
            <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, monthDate);
                const isDragged =
                  dragRangeSet && dayStr >= dragRangeSet.start && dayStr <= dragRangeSet.end;

                return (
                  <div
                    key={dayStr}
                    data-date={dayStr}
                    onPointerDown={(e) => handleDayPointerDown(e, dayStr)}
                    onPointerEnter={() => handleDayPointerEnter(dayStr)}
                    className={`group flex min-h-[132px] cursor-pointer flex-col gap-0.5 pt-1 pb-1 ${
                      inMonth ? "bg-card" : "bg-muted/20"
                    } ${isDragged ? "bg-primary/10" : ""}`}
                  >
                    <div className="px-1">
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-xs ${
                          isToday(day)
                            ? "bg-primary font-semibold text-primary-foreground"
                            : inMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="flex flex-col" style={{ gap: 2 }}>
                      {Array.from({ length: maxBookingLanes }).map((_, lane) => {
                        const booking = overlappingBookings.find(
                          (b) =>
                            bookingLaneOf.get(b.id) === lane &&
                            b.check_in <= dayStr &&
                            b.check_out >= dayStr
                        );

                        if (!booking) {
                          return <div key={lane} className="h-[20px]" />;
                        }

                        const isStart = booking.check_in === dayStr || dayStr === weekStartStr;
                        const isEnd = booking.check_out === dayStr || dayStr === weekEndStr;
                        const color = booking.channels?.color ?? "#3182f6";

                        return (
                          <BookingFormDialog
                            key={booking.id}
                            booking={booking}
                            properties={properties}
                            channels={channels}
                            paymentTypes={paymentTypes}
                            trigger={
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                className={`h-[20px] truncate px-1.5 text-left text-[11px] font-medium text-white ${
                                  isStart ? "rounded-l-sm" : ""
                                } ${isEnd ? "rounded-r-sm" : ""}`}
                                style={{ backgroundColor: color }}
                                title={`${booking.properties?.name ?? ""} - ${booking.guest_name}`}
                              >
                                {isStart
                                  ? `${booking.properties?.name ? `${booking.properties.name} - ` : ""}${booking.guest_name}`
                                  : ""}
                              </button>
                            }
                          />
                        );
                      })}
                    </div>

                    <div className="flex flex-col" style={{ gap: 2 }}>
                      {Array.from({ length: maxEventLanes }).map((_, lane) => {
                        const event = overlappingEvents.find(
                          (e) =>
                            eventLaneOf.get(e.id) === lane && e.date <= dayStr && e.end_date >= dayStr
                        );

                        if (!event) {
                          return <div key={lane} className="h-[20px]" />;
                        }

                        const isStart = event.date === dayStr || dayStr === weekStartStr;
                        const isEnd = event.end_date === dayStr || dayStr === weekEndStr;
                        const color = event.event_categories?.color ?? DEFAULT_EVENT_COLOR;

                        return (
                          <div
                            key={event.id}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`flex h-[20px] items-center gap-1 text-[11px] ${
                              isStart ? "rounded-l-sm" : ""
                            } ${isEnd ? "rounded-r-sm" : ""} ${
                              event.is_completed
                                ? "bg-muted text-muted-foreground line-through"
                                : "text-white"
                            }`}
                            style={event.is_completed ? undefined : { backgroundColor: color }}
                          >
                            <input
                              type="checkbox"
                              className="ml-1.5 size-3 shrink-0"
                              checked={event.is_completed}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                startTransition(async () => {
                                  await toggleCalendarEventCompletion(event.id, checked);
                                });
                              }}
                            />
                            <EventFormDialog
                              event={event}
                              categories={eventCategories}
                              trigger={
                                <button type="button" className="h-full flex-1 truncate px-1 text-left">
                                  {isStart &&
                                    `${event.event_categories ? `[${event.event_categories.name}] ` : ""}${event.title}`}
                                </button>
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {createRange && (
        <EventFormDialog
          key={`${createRange.start}-${createRange.end}`}
          categories={eventCategories}
          open
          onOpenChange={(open) => {
            if (!open) setCreateRange(null);
          }}
          defaultStart={createRange.start}
          defaultEnd={createRange.end}
        />
      )}
    </div>
  );
}
