import Link from "next/link";
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

const columns = ["날짜", "구분", "카테고리", "숙소", "메모", "금액", ""];

export default async function LedgerPage() {
  await ensureDefaultCategories();

  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }, { data: properties }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(name), properties(name)")
      .order("date", { ascending: false })
      .limit(100),
    supabase.from("categories").select("*").order("name"),
    supabase.from("properties").select("*").order("name"),
  ]);

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
              {!transactions || transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                    등록된 거래 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
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
                    <TableCell>{t.properties?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-48 truncate">{t.memo ?? "-"}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        t.type === "income"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {Number(t.amount).toLocaleString()}원
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
        </CardContent>
      </Card>
    </div>
  );
}
