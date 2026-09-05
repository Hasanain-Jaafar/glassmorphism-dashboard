-- ============================================================================
-- AI Brain — structured widgets (metric cards, ranked lists, pipeline
-- funnels, tables) an assistant reply can carry alongside its plain-text
-- content. Nullable: user messages and older assistant replies never set it.
-- ============================================================================

alter table public.ai_messages
  add column blocks jsonb;
