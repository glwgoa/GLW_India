-- Add "developer" as a new employee role (permissions default to the same
-- as "employee" — no policy references "employee" specially today, so no
-- RLS changes are needed for it to behave the same way).
alter type user_role add value 'developer';
