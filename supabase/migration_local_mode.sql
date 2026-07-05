-- Migration: add local mode columns to game_sessions
-- Run this in Supabase SQL Editor

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS current_local_turn   integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS local_roles          jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS local_hint_done      integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS local_votes          jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS local_tiebreak_candidates integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eliminated_this_round integer;
