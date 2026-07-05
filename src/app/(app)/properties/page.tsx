import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PropertyFormDialog } from "@/components/properties/property-form-dialog";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, base_capacity, max_capacity, base_price, status")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">숙소</h1>
          <p className="text-sm text-muted-foreground">등록된 숙소를 관리하세요.</p>
        </div>
        <PropertyFormDialog
          trigger={
            <Button>
              <Plus />
              숙소 등록
            </Button>
          }
        />
      </div>

      {!properties || properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">등록된 숙소가 없습니다.</p>
            <p className="text-xs text-muted-foreground">
              숙소를 등록하면 이 목록과{" "}
              <Link href="/bookings" className="underline underline-offset-2">
                예약 관리
              </Link>
              에서 바로 사용할 수 있어요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{property.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.address || "주소 미등록"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={property.status === "active" ? "secondary" : "outline"}>
                      {property.status === "active" ? "사용중" : "비활성"}
                    </Badge>
                    {property.base_capacity && (
                      <Badge variant="outline">
                        기준 {property.base_capacity}인 · 최대 {property.max_capacity ?? "-"}인
                      </Badge>
                    )}
                    {property.base_price && (
                      <Badge variant="outline">{Number(property.base_price).toLocaleString()}원</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
