-- 숙소별 색상 구분(가계부/예약관리에서 색으로 식별)을 위한 컬럼 추가
alter table properties add column if not exists color text;
