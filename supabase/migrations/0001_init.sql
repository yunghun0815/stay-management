-- 개인용 숙소관리 플랫폼 초기 스키마
-- 1인 사용자 전용: 모든 테이블에 owner_id를 두고 auth.uid() = owner_id RLS 정책만 적용

create extension if not exists "pgcrypto";

-- 숙소
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  address text,
  type text, -- 게스트하우스/펜션/에어비앤비/풀빌라 등
  created_at timestamptz not null default now()
);

-- 객실
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  base_capacity int,
  max_capacity int,
  base_price numeric,
  status text not null default 'active', -- active / inactive
  created_at timestamptz not null default now()
);

-- 예약
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  guest_name text not null,
  guest_phone text,
  check_in date not null,
  check_out date not null,
  guest_count int,
  channel text, -- direct / airbnb / yanolja / naver / etc
  total_amount numeric,
  payment_status text not null default 'unpaid', -- paid / unpaid / partial
  status text not null default 'confirmed', -- confirmed / checked_in / checked_out / cancelled
  memo text,
  created_at timestamptz not null default now(),
  constraint bookings_date_range_check check (check_out > check_in)
);

-- 카테고리
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- income / expense
  color text,
  created_at timestamptz not null default now()
);

-- 거래(가계부)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  amount numeric not null,
  type text not null, -- income / expense
  category_id uuid references categories(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  memo text,
  is_recurring boolean not null default false,
  recurring_rule jsonb,
  created_at timestamptz not null default now()
);

-- 캘린더 이벤트(수동 등록용)
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  type text, -- check_in / check_out / cleaning / maintenance / custom
  related_booking_id uuid references bookings(id) on delete cascade,
  is_completed boolean not null default false,
  memo text,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_rooms_property_id on rooms(property_id);
create index if not exists idx_bookings_room_id on bookings(room_id);
create index if not exists idx_bookings_check_in on bookings(check_in);
create index if not exists idx_bookings_check_out on bookings(check_out);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_category_id on transactions(category_id);
create index if not exists idx_calendar_events_date on calendar_events(date);

-- RLS 활성화
alter table properties enable row level security;
alter table rooms enable row level security;
alter table bookings enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table calendar_events enable row level security;

-- 1인 사용자 정책: 본인 소유 행만 조회/수정 가능
do $$
declare
  t text;
begin
  foreach t in array array['properties', 'rooms', 'bookings', 'categories', 'transactions', 'calendar_events']
  loop
    execute format('drop policy if exists "owner_all" on %I', t);
    execute format(
      'create policy "owner_all" on %I for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id)',
      t
    );
  end loop;
end $$;

-- 기본 카테고리 시드는 애플리케이션에서 최초 로그인 시 owner_id를 채워 삽입한다.
