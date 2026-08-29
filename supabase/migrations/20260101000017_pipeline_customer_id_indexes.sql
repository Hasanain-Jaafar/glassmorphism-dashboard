-- customers_select (20260101000013_customers_select_by_pipeline.sql) added 4
-- EXISTS subqueries against appointments/quotations/deals/invoices, each
-- filtered on customer_id — but the original schema only indexed
-- sales_rep_id on those tables (20260101000001_schema.sql). Without an
-- index on customer_id, every non-admin SELECT on customers risks a
-- sequential scan of all four tables as they grow. Composite indexes here
-- directly serve the "customer_id = X and sales_rep_id = auth.uid()"
-- predicate those subqueries use.

create index appointments_customer_id_sales_rep_id_idx
  on public.appointments (customer_id, sales_rep_id);

create index quotations_customer_id_sales_rep_id_idx
  on public.quotations (customer_id, sales_rep_id);

create index deals_customer_id_sales_rep_id_idx
  on public.deals (customer_id, sales_rep_id);

create index invoices_customer_id_sales_rep_id_idx
  on public.invoices (customer_id, sales_rep_id);
