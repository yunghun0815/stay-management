-- 수동/청소 일정도 예약처럼 기간(시작일~종료일)을 가질 수 있도록 확장

alter table calendar_events add column if not exists end_date date;
update calendar_events set end_date = date where end_date is null;
alter table calendar_events alter column end_date set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_date_range_check'
  ) then
    alter table calendar_events add constraint calendar_events_date_range_check check (end_date >= date);
  end if;
end $$;
