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
(Products page), **company targets** (Targets → Company tab).

Still mock data in `lib/mock-data.ts`: individual (per-rep) targets, and all
sales performance numbers (monthly/yearly sales, closed deals, conversion,
avg deal) shown on the Team page — those require real `appointments` /
`quotations` / `deals` / `invoices` rows, and there's no UI yet to create
them. New sales reps you add will show up with real identities everywhere,
just with $0 / 0 performance stats until that workflow is built.
