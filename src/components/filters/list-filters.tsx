"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Property } from "@/types/supabase";

export function ListFilters({
  properties,
  defaultFrom,
  defaultTo,
  showType = false,
}: {
  properties: Property[];
  defaultFrom: string;
  defaultTo: string;
  showType?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const propertyId = searchParams.get("property_id") ?? "all";
  const dateFrom = searchParams.get("date_from") ?? defaultFrom;
  const dateTo = searchParams.get("date_to") ?? defaultTo;
  const type = searchParams.get("type") ?? "all";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">숙소</Label>
        <Select value={propertyId} onValueChange={(v) => update("property_id", v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) =>
                value === "all" ? "전체 숙소" : (properties.find((p) => p.id === value)?.name ?? "전체 숙소")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 숙소</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">시작일</Label>
        <Input
          type="date"
          max="9999-12-31"
          value={dateFrom}
          onChange={(e) => update("date_from", e.target.value)}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">종료일</Label>
        <Input
          type="date"
          max="9999-12-31"
          value={dateTo}
          onChange={(e) => update("date_to", e.target.value)}
          className="w-36"
        />
      </div>

      {showType && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">구분</Label>
          <Select value={type} onValueChange={(v) => update("type", v ?? "all")}>
            <SelectTrigger className="w-28">
              <SelectValue>
                {(value: string) =>
                  value === "income" ? "수입" : value === "expense" ? "지출" : "전체"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="income">수입</SelectItem>
              <SelectItem value="expense">지출</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
