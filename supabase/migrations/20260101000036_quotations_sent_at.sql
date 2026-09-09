-- Tracks when a quotation was (most recently) marked "sent", separate from
-- the auto-maintained updated_at (which bumps on every edit, not just a
-- status change) and created_at (which predates sending — a quotation can
-- sit in draft for a while first). Powers the "follow up" highlight on
-- quotations sent 3+ working days ago with no response. Stamped from
-- application code (lib/supabase/quotations.ts), matching how deals.closed_at
-- and invoices.paid_at are already stamped there rather than via a trigger.

alter table public.quotations
  add column sent_at timestamptz;
