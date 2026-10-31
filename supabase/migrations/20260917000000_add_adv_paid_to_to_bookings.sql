-- Which account/wallet the advance payment was received in.
alter table bookings add column adv_paid_to text;
