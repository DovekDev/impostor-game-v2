import { Card, GameSession, Player, Vote, PlayerRole } from "@/types";

export type AlivePlayerSummary = {
  role: PlayerRole;
  is_alive: boolean;
};

export type VoteResult = {
  eliminated: string | null;
  isTie: boolean;
  tiedPlayerIds: string[];
};

export function checkWinCondition(alivePlayers: AlivePlayerSummary[]): "innocents" | "impostors" | null {
  const impostorCount = alivePlayers.filter((p) => p.role === "impostor").length;
  const aliveCount = alivePlayers.length;
  if (impostorCount === 0) return "innocents";
  if (aliveCount === 2 && impostorCount === 1) return "impostors";
  if (impostorCount / Math.max(1, aliveCount) >= 0.6) return "impostors";
  return null;
}

export function resolveImpostorCount(session: Partial<GameSession>, playerCount: number): number {
  if (!session) return 1;
  if (session.impostor_count_mode === "fixed") {
    return Math.max(1, Math.min(session.impostor_count_fixed || 1, playerCount - 1));
  }
  const min = Math.max(1, session.impostor_count_min || 1);
  const max = Math.min(session.impostor_count_max || Math.max(min, 1), Math.max(min, playerCount - 1));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shouldTriggerModifier(probability: number): boolean {
  return Math.random() < probability;
}

export function assignRoles(players: Array<Pick<Player, "id">>, impostorCount: number, recentImpostors: string[] = []): { impostors: string[]; innocents: string[] } {
  // Weight selection to avoid recent impostors where possible
  const candidates = [...players];
  // sort so non-recent appear first
  candidates.sort((a, b) => (recentImpostors.includes(a.id) === recentImpostors.includes(b.id) ? 0 : recentImpostors.includes(a.id) ? 1 : -1));
  // shuffle while keeping order bias
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const impostors = candidates.slice(0, impostorCount).map((p) => p.id);
  const innocents = candidates.slice(impostorCount).map((p) => p.id);
  return { impostors, innocents };
}

export function drawCard<T extends { id: string }>(activeCards: T[], usedCardIds: string[]): T {
  const available = activeCards.filter((c) => !usedCardIds.includes(c.id));
  let pool = available.length ? available : activeCards;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export function resolveVote(votes: Vote[]): VoteResult {
  if (!votes || votes.length === 0) return { eliminated: null, isTie: false, tiedPlayerIds: [] };
  const counts: Record<string, number> = {};
  for (const v of votes) {
    counts[v.target_id] = (counts[v.target_id] || 0) + 1;
  }
  let max = 0;
  for (const k of Object.keys(counts)) {
    if (counts[k] > max) max = counts[k];
  }
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  if (top.length > 1) return { eliminated: null, isTie: true, tiedPlayerIds: top };
  return { eliminated: top[0], isTie: false, tiedPlayerIds: [] };
}
