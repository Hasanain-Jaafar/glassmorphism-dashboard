-- Adds "Delivery Time" and "Made In" as free-text catalog attributes on
-- products (Products page). Nullable — existing rows have neither set, and
-- both stay optional on the product form.

alter table public.products
  add column if not exists delivery_time text,
  add column if not exists made_in text;
