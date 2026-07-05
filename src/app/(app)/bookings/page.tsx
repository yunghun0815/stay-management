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

const columns = ["예약자", "숙소", "체크인", "체크아웃", "채널", "금액", ""];

export default async function BookingsPage() {
  await ensureDefaultChannels();

  const supabase = await createClient();

  const [{ data: bookings }, { data: properties }, { data: channels }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, properties(name), channels(name, color)")
      .order("check_in", { ascending: false })
      .limit(100),
    supabase.from("properties").select("*").order("name"),
    supabase.from("channels").select("*").order("created_at"),
  ]);

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
          trigger={
            <Button>
              <Plus />
              예약 등록
            </Button>
          }
        />
      </div>

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
              {!bookings || bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                    등록된 예약이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.guest_name}</TableCell>
                    <TableCell>{booking.properties?.name}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
