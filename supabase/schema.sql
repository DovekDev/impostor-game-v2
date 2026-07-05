-- ============================================================
-- ¿Cat o Falso Nueve? — Complete Database Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================


-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";


-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Players
-- Every person who has ever joined the lobby gets a row here.
create table if not exists players (
  id              uuid primary key default uuid_generate_v4(),
  nickname        text not null,
  is_host         boolean not null default false,
  is_admin        boolean not null default false,
  is_in_lobby     boolean not null default false,
  games_played    integer not null default 0,
  wins_innocent   integer not null default 0,
  wins_impostor   integer not null default 0,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

-- Nicknames are case-insensitive unique
create unique index if not exists players_nickname_lower_idx
  on players (lower(nickname));

-- Only one player can be host at a time
-- This partial unique index enforces the constraint at the DB level
create unique index if not exists players_one_host_idx
  on players (is_host)
  where (is_host = true);


-- Cards
-- The deck of character/object cards used in the game.
-- Never hard-delete cards — set is_active = false instead.
create table if not exists cards (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  hint        text,
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);


-- Game Sessions (singleton)
-- Always exactly one row. Fixed UUID. Always upserted, never inserted twice.
create table if not exists game_sessions (
  id                          uuid primary key,
  state                       text not null default 'lobby',
  mode                        text not null default 'local',
  current_card_id             uuid references cards(id),
  impostor_count_mode         text not null default 'fixed',
  impostor_count_fixed        integer not null default 1,
  impostor_count_min          integer not null default 1,
  impostor_count_max          integer not null default 3,
  local_player_count          integer not null default 4,
  modifier_all_impostors      boolean not null default false,
  modifier_all_impostors_prob decimal(4,3) not null default 0.05,
  modifier_all_different      boolean not null default false,
  modifier_all_different_prob decimal(4,3) not null default 0.05,
  modifier_impostor_hints     boolean not null default false,
  current_round               integer not null default 0,
  current_turn_player_id      uuid references players(id),
  partida_number              integer not null default 0,
  used_card_ids               uuid[] not null default '{}',
  recent_impostor_ids         uuid[] not null default '{}',
  turn_order                  uuid[] not null default '{}',
  winner                      text,
  updated_at                  timestamptz not null default now()
);

-- Constraint: state must be a known value
alter table game_sessions
  add constraint game_sessions_state_check
  check (state in ('lobby','dealing','hints','voting','tiebreak','round_end','game_over'));

-- Constraint: mode must be local or online
alter table game_sessions
  add constraint game_sessions_mode_check
  check (mode in ('local','online'));

alter table game_sessions
  add column if not exists turn_order uuid[] not null default '{}';

-- Game Players (per partida)
-- Cleared between partidas. One row per player per partida.
create table if not exists game_players (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references game_sessions(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  role        text not null,
  card_id     uuid not null references cards(id),
  is_alive    boolean not null default true,
  hint_given  boolean not null default false,
  card_seen   boolean not null default false
);

alter table game_players
  add constraint game_players_role_check
  check (role in ('innocent','impostor'));

-- One row per player per session
create unique index if not exists game_players_unique_idx
  on game_players (session_id, player_id);


-- Votes
-- One row per vote per round. Cleared at start of each new round.
create table if not exists votes (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references game_sessions(id) on delete cascade,
  round       integer not null,
  voter_id    uuid not null references players(id) on delete cascade,
  target_id   uuid not null references players(id) on delete cascade,
  is_tiebreak boolean not null default false,
  created_at  timestamptz not null default now()
);

-- One vote per voter per round (not tiebreak)
create unique index if not exists votes_one_per_voter_idx
  on votes (session_id, round, voter_id, is_tiebreak);


-- Chat Messages (online mode only)
create table if not exists chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references game_sessions(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now()
);


-- ─── Row Level Security ───────────────────────────────────────────────────────
-- This app uses nickname-only auth (no Supabase Auth).
-- RLS is permissive — the anon key can read and write all tables.
-- Security model: trusted friend group.

alter table players enable row level security;
alter table cards enable row level security;
alter table game_sessions enable row level security;
alter table game_players enable row level security;
alter table votes enable row level security;
alter table chat_messages enable row level security;

-- Allow anon to do everything on all tables
create policy "anon full access" on players for all to anon using (true) with check (true);
create policy "anon full access" on cards for all to anon using (true) with check (true);
create policy "anon full access" on game_sessions for all to anon using (true) with check (true);
create policy "anon full access" on game_players for all to anon using (true) with check (true);
create policy "anon full access" on votes for all to anon using (true) with check (true);
create policy "anon full access" on chat_messages for all to anon using (true) with check (true);


-- ─── Storage ─────────────────────────────────────────────────────────────────
-- The 'cards' bucket for card images.
-- Public read — images are not secret.
-- Created via the Supabase dashboard (Storage tab) or via this insert:

insert into storage.buckets (id, name, public)
values ('cards', 'cards', true)
on conflict (id) do nothing;

-- Allow anon to read card images
create policy "public read cards"
  on storage.objects for select
  to anon
  using (bucket_id = 'cards');

-- Allow anon to upload card images (host uploads)
create policy "anon upload cards"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'cards');

-- Allow anon to update card images
create policy "anon update cards"
  on storage.objects for update
  to anon
  using (bucket_id = 'cards');

-- Allow anon to delete card images
create policy "anon delete cards"
  on storage.objects for delete
  to anon
  using (bucket_id = 'cards');


-- ─── Seed Data ────────────────────────────────────────────────────────────────

-- Default players: Dovek (admin) and Tom (host)
insert into players (nickname, is_host, is_admin, is_in_lobby)
values
  ('Dovek', false, true,  false),
  ('Tom',   true,  false, false)
on conflict do nothing;

-- Singleton game session
insert into game_sessions (
  id,
  state,
  mode,
  impostor_count_mode,
  impostor_count_fixed,
  impostor_count_min,
  impostor_count_max,
  modifier_all_impostors,
  modifier_all_impostors_prob,
  modifier_all_different,
  modifier_all_different_prob,
  modifier_impostor_hints,
  local_player_count,
  current_round,
  partida_number,
  used_card_ids,
  recent_impostor_ids
) values (
  '00000000-0000-0000-0000-000000000001',
  'lobby',
  'local',
  'fixed',
  1,
  1,
  3,
  false,
  0.05,
  false,
  0.05,
  false,
  4,
  0,
  0,
  '{}',
  '{}'
)
on conflict (id) do nothing;

-- Starter deck — 10 cards
insert into cards (name, hint, is_active) values
  ('Messi',          'Fútbol',          true),
  ('Volcán',         'Isla',            true),
  ('Batman',         'Murciélago',      true),
  ('Pizza',          'Italia',          true),
  ('Astronauta',     'Luna',            true),
  ('Dinosaurio',     'Extinción',       true),
  ('Miley Cyrus',    'Hannah Montana',  true),
  ('Submarino',      'Profundidad',     true),
  ('Pirámide',       'Egipto',          true),
  ('Dragón',         'Fuego',           true)
on conflict do nothing;


-- ─── Updated_at trigger for game_sessions ─────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger game_sessions_updated_at
  before update on game_sessions
  for each row execute function update_updated_at();
