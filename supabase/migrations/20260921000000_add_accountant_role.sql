-- New "accountant" role. Kept in its own file: a new enum value can't be used in
-- the same transaction that adds it, so the permissions are in the next migration.
alter type user_role add value if not exists 'accountant';
