-- ensureDefault* 함수들이 여러 요청에서 동시에 호출될 때 생긴 중복 행 정리
-- (각 그룹에서 가장 나중에 만들어진 행 하나만 남기고 삭제)
delete from payment_types t1
using payment_types t2
where t1.owner_id = t2.owner_id
  and t1.name = t2.name
  and t1.ctid < t2.ctid;

delete from categories t1
using categories t2
where t1.owner_id = t2.owner_id
  and t1.name = t2.name
  and t1.type = t2.type
  and t1.ctid < t2.ctid;

delete from channels t1
using channels t2
where t1.owner_id = t2.owner_id
  and t1.name = t2.name
  and t1.ctid < t2.ctid;

delete from event_categories t1
using event_categories t2
where t1.owner_id = t2.owner_id
  and t1.name = t2.name
  and t1.ctid < t2.ctid;

-- 이후 동일한 중복이 다시 생기지 않도록 유니크 제약 추가
create unique index if not exists idx_payment_types_owner_name on payment_types(owner_id, name);
create unique index if not exists idx_categories_owner_name_type on categories(owner_id, name, type);
create unique index if not exists idx_channels_owner_name on channels(owner_id, name);
create unique index if not exists idx_event_categories_owner_name on event_categories(owner_id, name);
