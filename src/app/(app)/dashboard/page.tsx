import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PropertyFilter } from "@/components/dashboard/property-filter";
import {
  CategoryPieChart,
  TrendLineChart,
  YearlyBarChart,
} from "@/components/ledger/report-charts";
import {
  endOfMonth,
  endOfYear,
  format,
  formatISO,
  getDaysInMonth,
  max,
  min,
  parse,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string }>;
}) {
  const { month: monthParam, property: propertyParam } = await searchParams;
  const now = parse(format(new Date(), "yyyy-MM-dd"), "yyyy-MM-dd", new Date());
  const monthDate = monthParam ? parse(monthParam, "yyyy-MM", new Date()) : now;
  const propertyId = propertyParam && propertyParam !== "all" ? propertyParam : null;

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthStartStr = formatISO(monthStart, { representation: "date" });
  const monthEndStr = formatISO(monthEnd, { representation: "date" });
  const todayStr = formatISO(now, { representation: "date" });

  const trendRangeStart = formatISO(startOfMonth(subMonths(monthDate, 11)), {
    representation: "date",
  });
  const yearRangeStart = formatISO(startOfYear(subYears(monthDate, 4)), {
    representation: "date",
  });
  const yearRangeEnd = formatISO(endOfYear(monthDate), { representation: "date" });

  const prevMonthKey = format(subMonths(monthDate, 1), "yyyy-MM");
  const nextMonthKey = format(subMonths(monthDate, -1), "yyyy-MM");
  const todayKey = format(now, "yyyy-MM");
  const propertyQuery = propertyId ? `&property=${propertyId}` : "";

  const supabase = await createClient();

  let transactionsQuery = supabase
    .from("transactions")
    .select("amount, type, date, categories(name), properties(name), bookings(channels(name, color))")
    .gte("date", trendRangeStart)
    .lte("date", monthEndStr);
  if (propertyId) transactionsQuery = transactionsQuery.eq("property_id", propertyId);

  let yearlyTransactionsQuery = supabase
    .from("transactions")
    .select("amount, type, date")
    .gte("date", yearRangeStart)
    .lte("date", yearRangeEnd);
  if (propertyId) yearlyTransactionsQuery = yearlyTransactionsQuery.eq("property_id", propertyId);

  let monthBookingsQuery = supabase
    .from("bookings")
    .select("check_in, check_out")
    .lte("check_in", monthEndStr)
    .gte("check_out", monthStartStr);
  if (propertyId) monthBookingsQuery = monthBookingsQuery.eq("property_id", propertyId);

  let checkInsQuery = supabase
    .from("bookings")
    .select("id, guest_name, check_in, properties(name)")
    .eq("check_in", todayStr);
  if (propertyId) checkInsQuery = checkInsQuery.eq("property_id", propertyId);

  let checkOutsQuery = supabase
    .from("bookings")
    .select("id, guest_name, check_out, properties(name)")
    .eq("check_out", todayStr);
  if (propertyId) checkOutsQuery = checkOutsQuery.eq("property_id", propertyId);

  const [
    { data: transactions },
    { data: yearlyTransactions },
    { data: monthBookings },
    { count: activePropertyCount },
    { data: todayCheckIns },
    { data: todayCheckOuts },
    { data: properties },
  ] = await Promise.all([
    transactionsQuery.returns<
      Array<{
        amount: number;
        type: "income" | "expense";
        date: string;
        categories: { name: string } | null;
        properties: { name: string } | null;
        bookings: { channels: { name: string; color: string | null } | null } | null;
      }>
    >(),
    yearlyTransactionsQuery.returns<
      Array<{ amount: number; type: "income" | "expense"; date: string }>
    >(),
    monthBookingsQuery.returns<Array<{ check_in: string; check_out: string }>>(),
    propertyId
      ? Promise.resolve({ count: 1 })
      : supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "active"),
    checkInsQuery.returns<
      Array<{ id: string; guest_name: string; check_in: string; properties: { name: string } | null }>
    >(),
    checkOutsQuery.returns<
      Array<{ id: string; guest_name: string; check_out: string; properties: { name: string } | null }>
    >(),
    supabase.from("properties").select("*").order("name"),
  ]);

  const monthTransactions = (transactions ?? []).filter(
    (t) => t.date >= monthStartStr && t.date <= monthEndStr
  );

  const totalIncome = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const netIncome = totalIncome - totalExpense;

  const bookedNights = (monthBookings ?? []).reduce((sum, b) => {
    const start = max([new Date(b.check_in), monthStart]);
    const end = min([new Date(b.check_out), monthEnd]);
    const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return sum + nights;
  }, 0);

  const daysInMonth = getDaysInMonth(monthDate);
  const totalRoomNights = (activePropertyCount ?? 0) * daysInMonth;
  const occupancyRate = totalRoomNights > 0 ? Math.round((bookedNights / totalRoomNights) * 100) : 0;

  const summaryCards = [
    {
      label: "이번 달 총수입",
      value: `${totalIncome.toLocaleString()}원`,
      tone: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "이번 달 총지출",
      value: `${totalExpense.toLocaleString()}원`,
      tone: "text-red-600 dark:text-red-400",
    },
    {
      label: "이번 달 순수익",
      value: `${netIncome.toLocaleString()}원`,
      tone: netIncome >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400",
    },
    { label: "이번 달 가동률", value: `${occupancyRate}%`, tone: "text-foreground" },
  ];

  const expenseByCategory = new Map<string, number>();
  for (const t of monthTransactions) {
    if (t.type !== "expense") continue;
    const name = t.categories?.name ?? "미분류";
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + Number(t.amount));
  }

  const channelRevenue = new Map<string, number>();
  const channelColors = new Map<string, string | null>();
  for (const t of monthTransactions) {
    if (t.type !== "income") continue;
    const label = t.bookings?.channels?.name ?? "미분류";
    channelRevenue.set(label, (channelRevenue.get(label) ?? 0) + Number(t.amount));
    if (!channelColors.has(label)) channelColors.set(label, t.bookings?.channels?.color ?? null);
  }

  const trendMap = new Map<string, { income: number; expense: number }>();
  for (let i = 11; i >= 0; i--) {
    const key = format(subMonths(monthDate, i), "yyyy-MM");
    trendMap.set(key, { income: 0, expense: 0 });
  }
  for (const t of transactions ?? []) {
    const key = t.date.slice(0, 7);
    const entry = trendMap.get(key);
    if (!entry) continue;
    if (t.type === "income") entry.income += Number(t.amount);
    else entry.expense += Number(t.amount);
  }

  const yearlyMap = new Map<string, { income: number; expense: number }>();
  for (let i = 4; i >= 0; i--) {
    const key = format(subYears(monthDate, i), "yyyy");
    yearlyMap.set(key, { income: 0, expense: 0 });
  }
  for (const t of yearlyTransactions ?? []) {
    const key = t.date.slice(0, 4);
    const entry = yearlyMap.get(key);
    if (!entry) continue;
    if (t.type === "income") entry.income += Number(t.amount);
    else entry.expense += Number(t.amount);
  }

  const expenseData = Array.from(expenseByCategory, ([name, value]) => ({ name, value }));
  const channelData = Array.from(channelRevenue, ([name, value]) => ({
    name,
    value,
    color: channelColors.get(name) ?? undefined,
  }));
  const trendData = Array.from(trendMap, ([month, v]) => ({ month, ...v }));
  const yearlyData = Array.from(yearlyMap, ([year, v]) => ({ year, ...v }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            {format(monthDate, "yyyy년 M월")} 요약과 오늘의 체크인/체크아웃을 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PropertyFilter properties={properties ?? []} />
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard?month=${todayKey}${propertyQuery}`} />}
            >
              오늘
            </Button>
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              render={<Link href={`/dashboard?month=${prevMonthKey}${propertyQuery}`} />}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              render={<Link href={`/dashboard?month=${nextMonthKey}${propertyQuery}`} />}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold tabular-nums ${card.tone}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>오늘의 체크인</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {!todayCheckIns || todayCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 예약이 없습니다.</p>
            ) : (
              todayCheckIns.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{b.guest_name}</span>
                  <Badge variant="outline">{b.properties?.name}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>오늘의 체크아웃</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {!todayCheckOuts || todayCheckOuts.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 예약이 없습니다.</p>
            ) : (
              todayCheckOuts.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{b.guest_name}</span>
                  <Badge variant="outline">{b.properties?.name}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={expenseData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>예약채널별 매출 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={channelData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 12개월 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={trendData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>연도별 수익/지출</CardTitle>
          </CardHeader>
          <CardContent>
            <YearlyBarChart data={yearlyData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
