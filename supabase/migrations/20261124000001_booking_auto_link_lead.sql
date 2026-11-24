-- Link a booking to its Kommo lead automatically by phone number (any number listed in
-- customer_contact; last 10 digits). Most recent lead wins. Never overrides a manual link.
create or replace function public.link_booking_to_lead()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lead public.kommo_leads%rowtype;
begin
  if new.kommo_lead_id is not null or new.customer_contact is null then
    return new;
  end if;

  select l.* into lead
  from public.kommo_leads l
  where l.phone_digits in (
    select right(regexp_replace(part, '\D', '', 'g'), 10)
    from regexp_split_to_table(new.customer_contact, '[,;/|&\n]|\s{2,}|\yand\y|\yor\y', 'i') as part
    where length(regexp_replace(part, '\D', '', 'g')) >= 10
  )
  order by coalesce(l.lead_created_at, l.created_at) desc
  limit 1;

  if found then
    new.kommo_lead_id := lead.id;
    if tg_op = 'INSERT' then
      new.source := coalesce(new.source, lead.source);
      new.utm_campaign := coalesce(new.utm_campaign, lead.utm_campaign);
      new.gclid := coalesce(new.gclid, lead.gclid);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_link_lead on public.bookings;
create trigger bookings_link_lead
before insert or update of customer_contact on public.bookings
for each row execute function public.link_booking_to_lead();

-- One-time backfill: link existing unlinked bookings (link only; source/UTM left untouched).
update public.bookings b
set kommo_lead_id = (
  select l.id from public.kommo_leads l
  where l.phone_digits in (
    select right(regexp_replace(part, '\D', '', 'g'), 10)
    from regexp_split_to_table(b.customer_contact, '[,;/|&\n]|\s{2,}|\yand\y|\yor\y', 'i') as part
    where length(regexp_replace(part, '\D', '', 'g')) >= 10
  )
  order by coalesce(l.lead_created_at, l.created_at) desc
  limit 1
)
where b.kommo_lead_id is null and b.customer_contact is not null;
