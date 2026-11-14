-- Run this first, on its own (a new enum value can't be used in the same transaction).
alter type gst_doc_type add value if not exists 'proforma';
