// Game session singleton ID — never changes, always upserted
export const GAME_SESSION_ID = "00000000-0000-0000-0000-000000000001";

// Reserved nicknames
export const ADMIN_NICKNAME = "Dovek";
export const DEFAULT_HOST_NICKNAME = "Tom";

// Voting
export const VOTE_CHANGE_WINDOW_MS = 5000; // 5 seconds to change vote

// Win condition
export const IMPOSTOR_WIN_THRESHOLD = 0.6; // 60% of alive players

// Minimum players to start a game
export const MIN_PLAYERS_TO_START = 3;

// Online mode timers
export const CARD_REVEAL_COUNTDOWN_MS = 5000; // 5s after all reveal
export const DEBATE_TIMER_MS = 50000; // 50s free debate

// Player color index — assign by join order
export const PLAYER_COLORS = [
  "text-player-1",
  "text-player-2",
  "text-player-3",
  "text-player-4",
  "text-player-5",
  "text-player-6",
] as const;

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
