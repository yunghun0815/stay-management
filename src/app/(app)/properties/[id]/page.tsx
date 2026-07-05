import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PropertyFormDialog } from "@/components/properties/property-form-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteProperty } from "@/lib/actions/properties";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, guest_name, check_in, check_out, channels(name)")
    .eq("property_id", id)
    .order("check_in", { ascending: false })
    .limit(20)
    .returns<
      Array<{
        id: string;
        guest_name: string;
        check_in: string;
        check_out: string;
        channels: { name: string } | null;
      }>
    >();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
            <Badge variant={property.status === "active" ? "secondary" : "outline"}>
              {property.status === "active" ? "사용중" : "비활성"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{property.address || "주소 미등록"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            기준 {property.base_capacity ?? "-"}인 / 최대 {property.max_capacity ?? "-"}인 ·{" "}
            {property.base_price ? `${Number(property.base_price).toLocaleString()}원` : "가격 미등록"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PropertyFormDialog
            property={property}
            trigger={
              <Button variant="outline" size="icon">
                <Pencil />
              </Button>
            }
          />
          <ConfirmDeleteButton
            action={deleteProperty.bind(null, property.id)}
            confirmMessage="숙소를 삭제하면 예약도 함께 삭제됩니다. 계속할까요?"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>예약 이력</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!bookings || bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">예약 이력이 없습니다.</p>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{booking.guest_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.check_in} ~ {booking.check_out}
                  </p>
                </div>
                {booking.channels?.name && (
                  <Badge variant="outline">{booking.channels.name}</Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
