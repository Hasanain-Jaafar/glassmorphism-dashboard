-- ============================================================================
-- Categorizes each coaching note (Coaching page's type selector) so the log
-- reads as more than a flat timeline — praise vs. a concern vs. an action
-- item vs. a general observation.
-- ============================================================================

create type public.coaching_note_type as enum ('general', 'praise', 'concern', 'action_item');

alter table public.coaching_notes
  add column if not exists type public.coaching_note_type not null default 'general';
