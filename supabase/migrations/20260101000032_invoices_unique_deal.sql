-- A deal can produce at most one invoice, ever — the app already enforces
-- this in the Add Invoice form (invoiceableDeals excludes deals that already
-- have an invoice), and the deals-side trigger (migration 27) already locks
-- a deal's status the instant any invoice references it. This makes the
-- same rule DB-enforced, closing the race-condition gap the UI filter alone
-- can't cover.
--
-- If this fails, it means duplicate invoices already exist for some
-- deal_id — find them with:
--   select deal_id, count(*) from public.invoices group by deal_id having count(*) > 1;
-- and resolve those rows before re-running.

create unique index if not exists invoices_deal_id_unique
  on public.invoices (deal_id);
