-- 객실 개념을 숙소로 통합하고, 예약상태/결제상태를 제거하고, 예약채널을 테이블로 관리

-- 1) 숙소가 객실 속성을 흡수
alter table properties add column if not exists base_capacity int;
alter table properties add column if not exists max_capacity int;
alter table properties add column if not exists base_price numeric;
alter table properties add column if not exists status text not null default 'active';

-- 2) 예약: room_id -> property_id
alter table bookings add column if not exists property_id uuid references properties(id) on delete cascade;
update bookings b set property_id = r.property_id from rooms r where b.room_id = r.id and b.property_id is null;
alter table bookings alter column property_id set not null;
alter table bookings drop column if exists room_id;

-- 3) 예약: 예약상태/결제상태 제거
alter table bookings drop column if exists status;
alter table bookings drop column if exists payment_status;

-- 4) 예약채널 관리 테이블
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

alter table bookings add column if not exists channel_id uuid references channels(id);
alter table bookings drop column if exists channel;

-- 5) 거래: room_id 제거 (property_id만 사용)
alter table transactions drop column if exists room_id;

-- 6) rooms 테이블 제거
drop table if exists rooms cascade;

-- 인덱스 정리
create index if not exists idx_bookings_property_id on bookings(property_id);
drop index if exists idx_bookings_room_id;
drop index if exists idx_rooms_property_id;

-- RLS
alter table channels enable row level security;
drop policy if exists "owner_all" on channels;
create policy "owner_all" on channels for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
