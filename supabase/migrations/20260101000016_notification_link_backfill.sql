-- 20260101000015_notification_fixes.sql fixed the trigger, but that only
-- changes notifications generated AFTER it runs — the `link` column is
-- stored text, written once at insert time, so every notification created
-- before the fix keeps its old '/team?person=<rep id>' link forever.
--
-- We can't recover which specific appointment/deal a historical row was
-- about (only the rep id was ever stored, baked into that old link text),
-- so this is a best-effort repoint: the right page, not a specific
-- highlighted row. New notifications going forward get the precise
-- /appointments?id=/deals?id= link from the fixed trigger.
--
-- Safe to re-run — only touches rows still carrying the old link shape.

update public.notifications
set link = '/appointments'
where type = 'new_appointment' and link like '/team?person=%';

update public.notifications
set link = '/deals'
where type = 'deal_won' and link like '/team?person=%';
