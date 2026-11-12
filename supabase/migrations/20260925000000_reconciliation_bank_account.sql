-- Which bank account (same list as transactions.brand / "Bank A/c") a transaction was reconciled against.
alter table transaction_reconciliations add column if not exists bank_account text;
