import { format, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BookingFormDialog } from "@/components/bookings/booking-form-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteBooking } from "@/lib/actions/bookings";
import { ensureDefaultChannels } from "@/lib/actions/channels";
import { ensureDefaultPaymentTypes } from "@/lib/actions/payment-types";
import { ListFilters } from "@/components/filters/list-filters";
import { PaginationBar } from "@/components/pagination-bar";

const columns = ["숙소", "예약자", "체크인", "체크아웃", "채널", "금액", ""];
const PAGE_SIZE = 10;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    property_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
  }>;
}) {
  await ensureDefaultChannels();
  await ensureDefaultPaymentTypes();

  const sp = await searchParams;
  const defaultFrom = format(subMonths(new Date(), 6), "yyyy-MM-dd");
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const propertyId = sp.property_id ?? "";
  const dateFrom = sp.date_from || defaultFrom;
  const dateTo = sp.date_to || defaultTo;
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select("*, properties(name), channels(name, color)", { count: "exact" })
    .gte("check_in", dateFrom)
    .lte("check_in", dateTo)
    .order("check_in", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (propertyId) query = query.eq("property_id", propertyId);

  const [{ data: bookings, count, error }, { data: properties }, { data: channels }, { data: paymentTypes }] =
    await Promise.all([
      query,
      supabase.from("properties").select("*").order("name"),
      supabase.from("channels").select("*").order("created_at"),
      supabase.from("payment_types").select("*").order("name"),
    ]);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">예약 관리</h1>
          <p className="text-sm text-muted-foreground">예약 목록을 관리하세요.</p>
        </div>
        <BookingFormDialog
          properties={properties ?? []}
          channels={channels ?? []}
          paymentTypes={paymentTypes ?? []}
          trigger={
            <Button>
              <Plus />
              예약 등록
            </Button>
          }
        />
      </div>

      <ListFilters properties={properties ?? []} defaultFrom={defaultFrom} defaultTo={defaultTo} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-destructive">
                    데이터를 불러오지 못했습니다: {error.message}
                  </TableCell>
                </TableRow>
              ) : !bookings || bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                    조건에 맞는 예약이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.properties?.name ?? "-"}</TableCell>
                    <TableCell className="font-medium">{booking.guest_name}</TableCell>
                    <TableCell>{booking.check_in}</TableCell>
                    <TableCell>{booking.check_out}</TableCell>
                    <TableCell>
                      {booking.channels?.name && (
                        <Badge
                          variant="outline"
                          style={booking.channels.color ? { color: booking.channels.color } : undefined}
                        >
                          {booking.channels.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {booking.total_amount ? `${Number(booking.total_amount).toLocaleString()}원` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <BookingFormDialog
                          booking={booking}
                          properties={properties ?? []}
                          channels={channels ?? []}
                          paymentTypes={paymentTypes ?? []}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil />
                            </Button>
                          }
                        />
                        <ConfirmDeleteButton action={deleteBooking.bind(null, booking.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} />
        </CardContent>
      </Card>
    </div>
  );
}
