-- An appointment fixes both the customer and the date, so "no duplicate
-- quotation for the same customer + date" is enforced here as "no more than
-- one active (draft/sent/accepted) quotation per appointment." A rejected or
-- expired quotation doesn't count, so re-quoting the same appointment after
-- a rejection — already the only supported way to re-quote — stays allowed.
-- The app already filters the "Select an appointment" dropdown the same
-- way; this closes the race-condition gap the UI filter alone can't cover.
--
-- If this fails, it means duplicate active quotations already exist for
-- some appointment_id — find them with:
--   select appointment_id, count(*) from public.quotations
--   where status not in ('rejected', 'expired')
--   group by appointment_id having count(*) > 1;
-- and resolve those rows before re-running.

create unique index if not exists quotations_appointment_id_active_unique
  on public.quotations (appointment_id)
  where status not in ('rejected', 'expired');
