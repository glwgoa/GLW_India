-- Extended vendor directory/payment fields.
alter table vendors add column category text;
alter table vendors add column priority text; -- 'high' | 'medium' | 'low', enforced at UI layer
alter table vendors add column bank_account_number text;
alter table vendors add column ifsc_code text;
alter table vendors add column bank_account_name text;
alter table vendors add column upi_id text;
alter table vendors add column payment_terms text;
alter table vendors add column city text;
alter table vendors add column location text;
alter table vendors add column additional_contact_number text;
