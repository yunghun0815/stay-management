-- 채널/카테고리 삭제 시 참조 무결성 에러가 나지 않도록 SET NULL로 변경
alter table bookings drop constraint if exists bookings_channel_id_fkey;
alter table bookings add constraint bookings_channel_id_fkey
  foreign key (channel_id) references channels(id) on delete set null;

alter table transactions drop constraint if exists transactions_category_id_fkey;
alter table transactions add constraint transactions_category_id_fkey
  foreign key (category_id) references categories(id) on delete set null;

-- 캘린더 일정 카테고리(색상 지정 가능) 관리 테이블
create table if not exists event_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

alter table event_categories enable row level security;
drop policy if exists "owner_all" on event_categories;
create policy "owner_all" on event_categories for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

alter table calendar_events add column if not exists category_id uuid references event_categories(id) on delete set null;
alter table calendar_events drop column if exists type;
