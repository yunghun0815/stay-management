-- 예약등록 결제구분은 가계부 카테고리와 별개로 관리
create table if not exists payment_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- income / expense
  color text,
  created_at timestamptz not null default now()
);

alter table payment_types enable row level security;
drop policy if exists "owner_all" on payment_types;
create policy "owner_all" on payment_types for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 예약별 결제내역(카테고리 세부 항목) 저장 - 가계부에는 합산된 숙박료 1건만 등록되고
-- 이 테이블은 예약 폼에서 항목을 다시 열었을 때 원래 입력값을 복원하기 위한 용도
create table if not exists booking_payment_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  payment_type_id uuid references payment_types(id) on delete set null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table booking_payment_lines enable row level security;
drop policy if exists "owner_all" on booking_payment_lines;
create policy "owner_all" on booking_payment_lines for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists idx_booking_payment_lines_booking_id on booking_payment_lines(booking_id);
