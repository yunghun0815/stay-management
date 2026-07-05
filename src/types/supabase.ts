export type PropertyStatus = "active" | "inactive";
export type TransactionType = "income" | "expense";

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  base_capacity: number | null;
  max_capacity: number | null;
  base_price: number | null;
  status: PropertyStatus;
  created_at: string;
}

export interface Channel {
  id: string;
  owner_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  owner_id: string;
  property_id: string;
  guest_name: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  guest_count: number | null;
  channel_id: string | null;
  total_amount: number | null;
  memo: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  owner_id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  owner_id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  property_id: string | null;
  booking_id: string | null;
  memo: string | null;
  is_recurring: boolean;
  recurring_rule: { frequency: string; day: number } | null;
  created_at: string;
}

export interface EventCategory {
  id: string;
  owner_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  owner_id: string;
  title: string;
  date: string;
  end_date: string;
  category_id: string | null;
  related_booking_id: string | null;
  is_completed: boolean;
  memo: string | null;
  created_at: string;
}
