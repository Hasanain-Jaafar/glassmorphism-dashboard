-- A quotation can produce at most one deal, ever — the app already enforces
-- this in the Add Deal form (dealableQuotations excludes quotations that
-- already have a deal), and the quotations-side triggers (migration 28)
-- already lock a quotation's status the instant any deal references it,
-- regardless of that deal's status. This makes the same rule DB-enforced,
-- closing the race-condition gap the UI filter alone can't cover.
--
-- If this fails, it means duplicate deals already exist for some
-- quotation_id — find them with:
--   select quotation_id, count(*) from public.deals group by quotation_id having count(*) > 1;
-- and resolve those rows before re-running.

create unique index if not exists deals_quotation_id_unique
  on public.deals (quotation_id);
