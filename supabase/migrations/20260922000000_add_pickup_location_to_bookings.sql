-- Pick-up location for Goa Trip bookings (Calangute, Candolim, Baga, Arpora).
alter table bookings add column if not exists pickup_location text;
