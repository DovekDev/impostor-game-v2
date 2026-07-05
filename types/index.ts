// ─── Player ───────────────────────────────────────────────────────────────────

export type Player = {
  id: string;
  nickname: string;
  is_host: boolean;
  is_admin: boolean;
  is_in_lobby: boolean;
  games_played: number;
  wins_innocent: number;
  wins_impostor: number;
  created_at: string;
  last_seen_at: string;
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export type Card = {
  id: string;
  name: string;
  hint: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

// ─── Game Session ─────────────────────────────────────────────────────────────

export type GameState =
  | "lobby"
  | "dealing"
  | "hints"
  | "voting"
  | "tiebreak"
  | "round_end"
  | "game_over";

export type GameMode = "local" | "online";

export type ImpostorCountMode = "fixed" | "random";

// Local mode role assignment — stored as jsonb in game_sessions.local_roles
export type LocalPlayerRole = {
  turn: number;       // 1-indexed player number
  role: PlayerRole;
  card_id: string;
  card_name: string;
  card_hint: string | null;
  card_image_url: string | null;
  is_alive: boolean;
};

export type GameSession = {
  id: string;
  state: GameState;
  mode: GameMode;
  current_card_id: string | null;
  impostor_count_mode: ImpostorCountMode;
  impostor_count_fixed: number;
  impostor_count_min: number;
  impostor_count_max: number;
  modifier_all_impostors: boolean;
  modifier_all_impostors_prob: number;
  modifier_all_different: boolean;
  modifier_all_different_prob: number;
  modifier_impostor_hints: boolean;
  current_round: number;
  // Online mode: UUID of current player
  current_turn_player_id: string | null;
  // Local mode: integer 1..local_player_count
  current_local_turn: number;
  local_player_count: number;
  // Local mode role assignments — no DB rows needed
  local_roles: LocalPlayerRole[];
  // Local mode votes: {[voterTurn: number]: targetTurn: number}
  local_votes: Record<string, number>;
  partida_number: number;
  used_card_ids: string[];
  recent_impostor_ids: string[];
  winner: "innocents" | "impostors" | null;
  eliminated_this_round: number | null;  // local mode: which turn number was eliminated
  updated_at: string;
};

// ─── Game Player (per partida) ────────────────────────────────────────────────

export type PlayerRole = "innocent" | "impostor";

export type GamePlayer = {
  id: string;
  session_id: string;
  player_id: string;
  role: PlayerRole;
  card_id: string;
  is_alive: boolean;
  hint_given: boolean;
};

// ─── Vote ─────────────────────────────────────────────────────────────────────

export type Vote = {
  id: string;
  session_id: string;
  round: number;
  voter_id: string;
  target_id: string;
  is_tiebreak: boolean;
  created_at: string;
};

// ─── Chat Message ─────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  session_id: string;
  player_id: string;
  message: string;
  created_at: string;
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export type WinCondition = "innocents" | "impostors" | null;

export type VoteResult = {
  eliminated: string | null;
  isTie: boolean;
  tiedPlayerIds: string[];
};
