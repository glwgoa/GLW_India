-- Make all vendor fields optional except id
alter table vendors alter column name drop not null;
alter table vendors alter column contact_email drop not null;
