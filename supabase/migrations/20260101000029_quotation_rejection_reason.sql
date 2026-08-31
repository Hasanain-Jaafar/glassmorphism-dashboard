-- A rejected quotation must record why, from a fixed set of reasons.
-- rejection_reason is required exactly when status = 'rejected', and null
-- otherwise (cleared if a rejected quotation is ever reopened to another
-- status) — enforced with a check constraint, not just in the app.

create type public.quotation_rejection_reason as enum (
  'high_price',
  'delivery_time',
  'bonus_limitation',
  'quality_issue'
);

alter table public.quotations
  add column rejection_reason public.quotation_rejection_reason;

-- One-time backfill: the only rejected quotation that predates this column.
update public.quotations
set rejection_reason = 'high_price'
where id = '48641b24-1a7c-4032-81e2-2db451100982' and status = 'rejected';

alter table public.quotations
  add constraint quotations_rejection_reason_matches_status check (
    (status = 'rejected' and rejection_reason is not null)
    or (status is distinct from 'rejected' and rejection_reason is null)
  );
