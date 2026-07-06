-- 예약 삭제 시 해당 예약으로 자동 등록된 가계부 거래도 함께 삭제되도록 CASCADE로 변경
alter table transactions drop constraint if exists transactions_booking_id_fkey;
alter table transactions add constraint transactions_booking_id_fkey
  foreign key (booking_id) references bookings(id) on delete cascade;
