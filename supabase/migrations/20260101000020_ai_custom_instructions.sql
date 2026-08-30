-- Per-user custom instructions for AI Brain (Settings → AI Brain), the
-- same "always applies" concept as ChatGPT's custom
-- instructions. Lives on profiles rather than a new table since it's a
-- single field with exactly the same ownership rules profiles already has
-- (profiles_select/profiles_update: id = auth.uid() or admin) — no new RLS
-- needed.

alter table public.profiles
  add column if not exists custom_instructions text;
