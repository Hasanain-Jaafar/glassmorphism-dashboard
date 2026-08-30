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
18. `20260101000018_target_quotation_weekly_notifications.sql` — wires up the
    3 notification types that migration 10 only added as preference columns:
    `target_reached` (trigger on `invoices`, fires the moment a paid invoice
    pushes a rep's or the company's monthly/yearly actual past its target —
    deduped via a new `target_achievement_notifications` table so it only
    fires once per period), `quotation_expiring` (daily `pg_cron` job, notifies
    once when a sent quotation's `valid_until` is within 3 days), and
    `weekly_summary` (Monday-morning `pg_cron` job recapping the past 7 days —
    company-wide for admins, personal for reps). **Requires the `pg_cron`
    extension** — enable it once via Dashboard → Database → Extensions before
    running this migration, or the two `cron.schedule(...)` calls at the
    bottom will fail (the `target_reached` trigger doesn't need it and still
    works on its own).
19. `20260101000019_ai_assistant.sql` — `ai_conversations` and `ai_messages`
    tables backing AI Brain (`/assistant`), the chat page with saved history.
    Private by design: RLS scopes every row to `auth.uid()`, so even an admin
    only ever sees their own conversations.
20. `20260101000020_ai_custom_instructions.sql` — adds
    `profiles.custom_instructions`, a per-user standing instruction AI Brain
    includes on every chat (Settings → AI Brain), the same idea as ChatGPT's
    custom instructions.
21. `20260101000021_ai_brain_admin_only.sql` — restricts `ai_conversations`/
    `ai_messages` RLS to admins only, matching the app-level gating already in
    `app/(dashboard)/assistant/page.tsx` and `app/api/assistant/chat/route.ts`
    (AI Brain is admin-only). **Required if you run 19 before this** — without
    it, a sales rep could still read/write their own AI Brain rows directly
    via their own Supabase session even though the UI and API route hide it.
22. `20260101000022_activity_targets.sql` — adds `appointments_target` and
    `deals_target` (nullable ints) to `targets`, for the Targets →
    Individual tab's per-rep edit dialog. Reuses the existing target row/RLS
    model — no new table or policies.
23. `20260101000023_knowledge_base.sql` — a private `knowledge-base` Storage
    bucket and `knowledge_base_documents` table backing AI Brain's knowledge
    base (Settings → AI Brain, admin-only both via RLS and app-level gating).
    PDFs are uploaded through `app/api/admin/knowledge-base/route.ts`, which
    extracts text once at upload time (via the `unpdf` package) and caches it
    in `content` — a scanned/image-only PDF with no text layer will upload
    fine but contribute nothing usable to AI Brain (no OCR).

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
your email. After that, use Sales Team → Settings in the app to create,
edit, and promote further accounts — no more SQL needed.

## 4. Email confirmation

Supabase projects default to requiring email confirmation on sign-up. For a
small internal team, either:

- Turn it off: **Authentication → Providers → Email → Confirm email** (off), or
- Leave it on and have each person confirm via the email Supabase sends.

Accounts created from Sales Team → Settings are created with
`email_confirm: true` already set, so they can sign in immediately either way.

## What's live vs. still mock data

Live in Supabase: **profiles/accounts** (Sales Team → Settings), **products**
(Products page), **customers** (Customers page — name/company/email/phone/
address/status/assigned salesperson; requires migration 11 above), **the
sales pipeline** (`/appointments`, `/quotations`, `/deals`, `/invoices` — a
rep manages their own, an admin sees everyone's; a quotation's line items
live in `quotation_items`), **company and individual targets** (Targets →
Company and Individual tabs, and the Team page's Salesperson Comparison
table), and **notifications** (bell + Settings → Notifications) — all 6 event types
now fire for real: coaching notes, appointments, and deals won are
trigger-backed on insert/update; target reached, quotation expiring, and the
weekly summary are backed by migration 18's trigger + `pg_cron` jobs (see
migration 18's note above — `pg_cron` must be enabled on the project for the
latter two), and **AI Brain** (`/assistant`, admin-only — Settings → AI Brain
for its per-user custom instructions and its knowledge base), which calls 5
read-only tools (`lib/ai/tools.ts`) — 4 backed by the same real aggregates
the rest of the dashboard uses, plus a 5th reading admin-uploaded knowledge
base PDFs — via the Claude API (requires `ANTHROPIC_API_KEY`).

The Dashboard, Team (KPI + All Salespeople tabs), Targets (Company tab and
the Individual tab's monthlySales/yearlySales columns), and Customers pages
are all wired to real aggregates now (`lib/company-performance.ts`,
`withTeamAggregates`/`withCustomerAggregates` in `lib/supabase/team.ts` /
`lib/customers-data.ts`), computed from the real appointments/quotations/
deals/invoices tables. Still mock/stubbed: `personActualForSelection()` in
`lib/target-period.ts` (always returns 0) — the Targets page's Individual
tab still shows $0 Actual/Achievement/Remaining for quarter/custom-range
selections, since that needs a per-rep monthly breakdown this project
doesn't compute yet (month/year selections are unaffected).
