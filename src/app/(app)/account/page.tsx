import { requireUser } from "@/lib/supabase/require-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordChangeForm } from "@/components/account/password-change-form";

export default async function AccountPage() {
  const { user } = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">마이페이지</h1>
        <p className="text-sm text-muted-foreground">계정 정보를 확인하고 관리하세요.</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">이메일</p>
          <p className="text-sm font-medium">{user.email}</p>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
