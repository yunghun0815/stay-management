import Link from "next/link";
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
import { TransactionFormDialog } from "@/components/ledger/transaction-form-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteTransaction } from "@/lib/actions/transactions";
import { ensureDefaultCategories } from "@/lib/actions/categories";
import { ListFilters } from "@/components/filters/list-filters";
import { PaginationBar } from "@/components/pagination-bar";

const columns = ["날짜", "숙소", "구분", "카테고리", "메모", "금액", ""];
const PAGE_SIZE = 10;

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    property_id?: string;
    date_from?: string;
    date_to?: string;
    type?: string;
    page?: string;
  }>;
}) {
  await ensureDefaultCategories();

  const sp = await searchParams;
  const defaultFrom = format(subMonths(new Date(), 6), "yyyy-MM-dd");
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const propertyId = sp.property_id ?? "";
  const dateFrom = sp.date_from || defaultFrom;
  const dateTo = sp.date_to || defaultTo;
  const type = sp.type === "income" || sp.type === "expense" ? sp.type : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("*, categories(name), properties(name)", { count: "exact" })
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (propertyId) query = query.eq("property_id", propertyId);
  if (type) query = query.eq("type", type);

  const [{ data: transactions, count, error }, { data: categories }, { data: properties }] =
    await Promise.all([
      query,
      supabase.from("categories").select("*").order("name"),
      supabase.from("properties").select("*").order("name"),
    ]);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">가계부</h1>
          <p className="text-sm text-muted-foreground">
            수입/지출 거래 내역을 확인하고 관리하세요.{" "}
            <Link href="/dashboard" className="underline underline-offset-2">
              대시보드에서 리포트 보기
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TransactionFormDialog
            categories={categories ?? []}
            properties={properties ?? []}
            trigger={
              <Button>
                <Plus />
                거래 등록
              </Button>
            }
          />
        </div>
      </div>

      <ListFilters
        properties={properties ?? []}
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
        showType
      />

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
              ) : !transactions || transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                    조건에 맞는 거래 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>{t.properties?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          t.type === "income"
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-red-700 dark:text-red-300"
                        }
                      >
                        {t.type === "income" ? "수입" : "지출"}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.categories?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-48 truncate">{t.memo ?? "-"}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        Number(t.amount) < 0
                          ? "text-red-600 dark:text-red-400"
                          : t.type === "income"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {Number(t.amount) < 0 ? "-" : t.type === "income" ? "+" : "-"}
                      {Math.abs(Number(t.amount)).toLocaleString()}원
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <TransactionFormDialog
                          transaction={t}
                          categories={categories ?? []}
                          properties={properties ?? []}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil />
                            </Button>
                          }
                        />
                        <ConfirmDeleteButton action={deleteTransaction.bind(null, t.id)} />
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
