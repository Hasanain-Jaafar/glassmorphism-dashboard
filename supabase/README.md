# Supabase Setup

Run these against your Supabase project's **SQL Editor**, in order. Each file
is idempotent-ish (`create or replace`, `create table if not exists` where it
matters) but they're meant to be run once, top to bottom.

## 1. Run the migrations

In `supabase/migrations/`, run each file in filename order:

1. `20260101000001_schema.sql` — tables, enums, indexes
2. `20260101000002_rls.sql` — Row Level Security policies
3. `20260101000003_storage.sql` — `product-images` and `avatars` buckets
4. `20260101000004_triggers.sql` — auto-creates a `profiles` row on sign-up
5. `20260101000005_service_role_bypass.sql` — lets the app's admin API
   (service-role key) set `role`/`is_active` without being reverted by the
   anti-escalation guard
6. `20260101000006_profile_extra_fields.sql` — adds `has_car` and
   `start_date` columns, collected on the Add/Edit Salesperson forms
7. `20260101000007_coaching_notes.sql` — `coaching_notes` table for the
   dedicated Coaching page, admin-only via RLS
8. `20260101000008_coaching_note_type.sql` — adds a `type` category
   (General/Praise/Concern/Action Item) to each coaching note
9. `20260101000009_coaching_notes_editable.sql` — adds `updated_at` and an
   author-only update policy so coaching notes can be edited
10. `20260101000010_notifications.sql` — `notifications` inbox and
    `notification_preferences`, fed by triggers on `coaching_notes` (insert),
    `appointments` (insert), and `deals` (status → `won`). `target_reached`,
    `quotation_expiring`, and `weekly_summary` exist as preference columns
    only — no trigger yet, since they need threshold/dedup logic or a
    scheduler that doesn't exist in this project yet
11. `20260101000011_customer_status.sql` — adds the `status`
    (active/prospect/inactive) column the Customers page has always shown,
    which the original `customers` table never had. **Required** — the
    Customers page will fail to load/save until this runs.
12. `20260101000012_customers_realtime.sql` — enables Supabase Realtime on
    `customers`, so one admin's add/edit/delete shows up for every other
    admin with /customers open, without a manual refresh.
13. `20260101000013_customers_select_by_pipeline.sql` — widens
    `customers_select` so a sales rep can also see a customer through their
    own appointments/quotations/deals/invoices, not only when they're the
    customer's `owner_id`. Fixes "Unassigned" showing up when a customer is
    reassigned or a different rep is put on one of their pipeline records.
14. `20260101000014_customer_auto_activate.sql` — a trigger that flips a
    customer from Prospect to Active the moment their first deal closes won,
    backing the copy already shown in the Add Customer dialog.
15. `20260101000015_notification_fixes.sql` — points the `new_appointment`
    and `deal_won` notification links at the actual appointment/deal
    (`/appointments?id=`, `/deals?id=`) instead of the Team page, and makes
    `deal_won` fire on insert too, so a deal created directly as "won" (not
    just one that transitions via an update) still notifies its rep.
    **Required if you use notifications** — safe to re-run.
16. `20260101000016_notification_link_backfill.sql` — one-time repoint of
    any *existing* notification rows still carrying the pre-15 `/team?person=`
    link (that migration only fixes the trigger, so it has no effect on rows
    already in the table). Run once after 15, if you had notifications
    before applying it.
17. `20260101000017_pipeline_customer_id_indexes.sql` — indexes `customer_id`
    (composite with `sales_rep_id`) on appointments/quotations/deals/invoices,
    which migration 13's RLS policy filters on but the original schema never
    indexed. Performance fix — safe to run any time.

## 2. Seed baseline data (optional)

`supabase/seed.sql` inserts the product catalog and company-wide targets.
Safe to re-run — it upserts by `sku` / target scope.

## 3. Promote your first admin

New sign-ups always default to `sales_rep` (nothing can create the first
admin through the app, since nothing is admin yet). Do it once via SQL:

```sql
-- The anti-escalation trigger blocks role changes from anything that isn't
-- already an admin or the app's service-role key — including the SQL editor
-- itself. Disable it just for this one bootstrap update.
alter table public.profiles disable trigger guard_profile_role_changes;
update public.profiles set role = 'admin' where email = 'you@example.com';
alter table public.profiles enable trigger guard_profile_role_changes;
```

Sign up normally on `/sign-in` first if you haven't, then run the above with
your email. After that, use Settings → Team & Access in the app to create,
edit, and promote further accounts — no more SQL needed.

## 4. Email confirmation

Supabase projects default to requiring email confirmation on sign-up. For a
small internal team, either:

- Turn it off: **Authentication → Providers → Email → Confirm email** (off), or
- Leave it on and have each person confirm via the email Supabase sends.

Accounts created from Settings → Team & Access are created with
`email_confirm: true` already set, so they can sign in immediately either way.

## What's live vs. still mock data

Live in Supabase: **profiles/accounts** (Settings → Team & Access), **products**
(Products page), **customers** (Customers page — name/company/email/phone/
address/status/assigned salesperson; requires migration 11 above), **the
sales pipeline** (`/appointments`, `/quotations`, `/deals`, `/invoices` — a
rep manages their own, an admin sees everyone's; a quotation's line items
live in `quotation_items`), **company and individual targets** (Targets →
Company and Individual tabs, and the Team page's Salesperson Comparison
table), and **notifications** (bell + Settings → Notifications) — all 3 of
its trigger-backed event types now fire for real (coaching notes,
appointments, deals won), since `/appointments` and `/deals` write real rows.
`target_reached`, `quotation_expiring`, and `weekly_summary` still have no
trigger — they need threshold/dedup logic or a scheduler this project
doesn't have yet.

Still mock data in `lib/mock-data.ts`: the Team page's KPI tab (person
filter, Sales Trend/Funnel/Needs Attention, and the metric cards/monthly
sales/closed-deals/conversion numbers across Team and Targets) — it's driven
by `lib/sales-analytics.ts` and `lib/supabase/team.ts`'s zeroed-out
performance fields, and hasn't been rewired to aggregate the now-real
appointments/quotations/deals/invoices tables yet. Same for customers' Total
Sales/Outstanding/Last Purchase/activity timeline on the Customers page
(`lib/supabase/customers.ts`'s `fromRow`) and the main Dashboard's KPIs —
real pipeline data now exists to aggregate from (e.g. `sum(invoices.amount)
where status = 'paid'` per customer/rep/month), but nothing queries it yet.
That rewiring is a separate follow-up.
