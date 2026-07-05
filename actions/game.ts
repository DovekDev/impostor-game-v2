"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  resolveImpostorCount,
  assignRoles,
  shouldTriggerModifier,
  drawCard,
} from "@/lib/game-engine";
import { GAME_SESSION_ID } from "@/lib/utils";

const StartGameSchema = z.object({
  requestingNickname: z.string().min(1),
  localPlayerCount: z.number().int().min(2).max(12).optional(),
});

// ─── Local mode ───────────────────────────────────────────────────────────────
// Players in local mode are NOT stored in the DB.
// They are simply numbers 1..local_player_count tracked via current_local_turn
// in game_sessions. No game_players rows are created for local mode.
//
// game_sessions columns used for local mode:
//   local_player_count  — how many physical players
//   current_local_turn  — which player number is currently active (1-based)
//   local_roles         — jsonb array: [{playerNum:1, role:'innocent', cardId:'...'}]
//   local_hint_done     — integer[] of playerNums who have confirmed hint given
//   local_votes         — jsonb {[voterNum]: targetNum}

// ─── Online mode ──────────────────────────────────────────────────────────────
// Players in online mode ARE in the DB (players table, is_in_lobby=true).
// game_players rows are created for each online player.

export async function startGame(raw: unknown) {
  try {
    const parsed = StartGameSchema.parse(raw);
    const supabase = await createSupabaseServer();

    // Verify requester is host
    const { data: hostRow } = await supabase
      .from("players")
      .select("id, nickname, is_host")
      .ilike("nickname", parsed.requestingNickname)
      .maybeSingle();

    if (!hostRow?.is_host) {
      return { success: false, error: "Solo el anfitrión puede iniciar la partida" };
    }

    const { data: session } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", GAME_SESSION_ID)
      .maybeSingle();

    if (!session) {
      return { success: false, error: "No se encontró la sesión de juego" };
    }

    const { data: cards } = await supabase
      .from("cards")
      .select("id, name, hint, image_url")
      .eq("is_active", true);

    if (!cards || cards.length === 0) {
      return { success: false, error: "No hay cartas activas en el mazo" };
    }

    // ── Card draw ──
    const usedCardIds: string[] = session.used_card_ids || [];
    let allImpostorsTriggered = false;
    let allDifferentTriggered = false;

    if (
      session.modifier_all_impostors &&
      shouldTriggerModifier(Number(session.modifier_all_impostors_prob || 0))
    ) {
      allImpostorsTriggered = true;
    }
    if (
      session.modifier_all_different &&
      shouldTriggerModifier(Number(session.modifier_all_different_prob || 0))
    ) {
      allDifferentTriggered = true;
    }

    // ── LOCAL MODE ────────────────────────────────────────────────────────────
    if (session.mode === "local") {
      const playerCount = Math.min(
        Math.max(parsed.localPlayerCount ?? session.local_player_count ?? 4, 2),
        12
      );
      if (playerCount < 2) {
        return { success: false, error: "Se necesitan al menos 2 jugadores" };
      }

      const impostorCount = allImpostorsTriggered
        ? playerCount
        : resolveImpostorCount(session, playerCount);

      // Build fake player objects just for role assignment (no DB)
      const fakePlayers = Array.from({ length: playerCount }, (_, i) => ({
        id: `local-${i + 1}`,
      }));

      const { impostors: impostorIds } = allImpostorsTriggered
        ? { impostors: fakePlayers.map((p) => p.id) }
        : assignRoles(fakePlayers, impostorCount, []);

      // Assign cards
      const localRoles: Array<{
        turn: number;
        role: "innocent" | "impostor";
        card_id: string;
        card_name: string;
        card_hint: string | null;
        card_image_url: string | null;
        is_alive: boolean;
      }> = [];

      // Innocents all share one card (unless allDifferent)
      let innocentCard = allDifferentTriggered
        ? null
        : drawCard(cards, usedCardIds);

      const newUsedCardIds = [...usedCardIds];
      if (innocentCard && !allDifferentTriggered) {
        newUsedCardIds.push(innocentCard.id);
      }

      // Shuffle cards pool for allDifferent mode
      const shuffledCards = allDifferentTriggered
        ? [...cards].sort(() => Math.random() - 0.5)
        : cards;

      for (let i = 0; i < playerCount; i++) {
        const playerNum = i + 1;
        const fakeId = `local-${playerNum}`;
        const isImpostor = impostorIds.includes(fakeId);

        let cardForPlayer = innocentCard;
        if (allDifferentTriggered) {
          cardForPlayer = shuffledCards[i % shuffledCards.length];
          newUsedCardIds.push(cardForPlayer.id);
        }

        const roleCard = isImpostor ? null : cardForPlayer; // impostors get no card info

        localRoles.push({
          turn: playerNum,
          role: isImpostor ? "impostor" : "innocent",
          card_id: roleCard?.id ?? "",
          card_name: roleCard?.name ?? "",
          card_hint: roleCard?.hint ?? null,
          card_image_url: roleCard?.image_url ?? null,
          is_alive: true,
        });
      }

      const updatedUsedCardIds = Array.from(new Set(newUsedCardIds));

      const updatePayload: Record<string, unknown> = {
        state: "dealing",
        current_round: 1,
        current_local_turn: 1,
        local_player_count: playerCount,
        local_hint_done: [],
        local_votes: {},
        local_roles: localRoles,
        partida_number: (session.partida_number || 0) + 1,
        used_card_ids: allDifferentTriggered ? usedCardIds : updatedUsedCardIds,
        winner: null,
        current_card_id: innocentCard?.id ?? null,
      };

      if (allImpostorsTriggered) updatePayload.modifier_all_impostors_prob = 0;
      if (allDifferentTriggered) updatePayload.modifier_all_different_prob = 0;

      const { error: sessErr } = await supabase
        .from("game_sessions")
        .update(updatePayload)
        .eq("id", GAME_SESSION_ID);

      if (sessErr) throw sessErr;

      return {
        success: true,
        playerCount,
        impostorCount,
        allImpostorsTriggered,
        allDifferentTriggered,
      };
    }

    // ── ONLINE MODE ───────────────────────────────────────────────────────────
    const { data: onlinePlayers } = await supabase
      .from("players")
      .select("id, nickname")
      .eq("is_in_lobby", true)
      .order("created_at", { ascending: true });

    const players = onlinePlayers || [];
    if (players.length < 3) {
      return { success: false, error: "Se necesitan al menos 3 jugadores para iniciar" };
    }

    const playerCount = players.length;
    const impostorCount = allImpostorsTriggered
      ? playerCount
      : resolveImpostorCount(session, playerCount);

    const { impostors: impostorIds } = allImpostorsTriggered
      ? { impostors: players.map((p) => p.id) }
      : assignRoles(players, impostorCount, session.recent_impostor_ids || []);

    let innocentCard = allDifferentTriggered
      ? null
      : drawCard(cards, usedCardIds);

    const shuffledCards = allDifferentTriggered
      ? [...cards].sort(() => Math.random() - 0.5)
      : cards;

    const newUsedCardIds = [...usedCardIds];
    if (innocentCard) newUsedCardIds.push(innocentCard.id);

    // Clear previous game_players
    await supabase
      .from("game_players")
      .delete()
      .eq("session_id", GAME_SESSION_ID);

    const rows = players.map((player, i) => {
      const isImpostor = impostorIds.includes(player.id);
      const cardId = allDifferentTriggered
        ? shuffledCards[i % shuffledCards.length].id
        : isImpostor
        ? drawCard(cards, []).id
        : innocentCard!.id;
      return {
        session_id: GAME_SESSION_ID,
        player_id: player.id,
        role: isImpostor ? "impostor" : "innocent",
        card_id: cardId,
        is_alive: true,
        hint_given: false,
        card_seen: false,
      };
    });

    const { error: insertErr } = await supabase
      .from("game_players")
      .insert(rows);
    if (insertErr) throw insertErr;

    const updatedUsedCardIds = Array.from(new Set(newUsedCardIds));

    const updatePayload: Record<string, unknown> = {
      state: "dealing",
      current_round: 1,
      current_turn_player_id: players[0].id,
      turn_order: players.map((p) => p.id),
      recent_impostor_ids: impostorIds,
      partida_number: (session.partida_number || 0) + 1,
      used_card_ids: allDifferentTriggered ? usedCardIds : updatedUsedCardIds,
      winner: null,
      current_card_id: innocentCard?.id ?? null,
    };

    if (allImpostorsTriggered) updatePayload.modifier_all_impostors_prob = 0;
    if (allDifferentTriggered) updatePayload.modifier_all_different_prob = 0;

    const { error: sessErr } = await supabase
      .from("game_sessions")
      .update(updatePayload)
      .eq("id", GAME_SESSION_ID);

    if (sessErr) throw sessErr;

    return {
      success: true,
      playerCount,
      impostorCount,
      allImpostorsTriggered,
      allDifferentTriggered,
    };
  } catch (error) {
    console.error("[actions/game/startGame]", error);
    return { success: false, error: "No se pudo iniciar la partida" };
  }
}

// ── Local mode turn/vote helpers ──────────────────────────────────────────────

const LocalTurnSchema = z.object({ requestingNickname: z.string().min(1) });

export async function advanceLocalTurn(raw: unknown) {
  try {
    const parsed = LocalTurnSchema.parse(raw);
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("current_local_turn, local_player_count, state")
      .eq("id", GAME_SESSION_ID)
      .maybeSingle();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const nextTurn = (session.current_local_turn || 1) + 1;
    const total = session.local_player_count || 4;

    if (nextTurn > total) {
      // All players have had their turn — move to hints phase
      const { error } = await supabase
        .from("game_sessions")
        .update({ state: "hints", current_local_turn: 1 })
        .eq("id", GAME_SESSION_ID);
      if (error) throw error;
      return { success: true, next: "hints" };
    }

    const { error } = await supabase
      .from("game_sessions")
      .update({ current_local_turn: nextTurn })
      .eq("id", GAME_SESSION_ID);
    if (error) throw error;

    return { success: true, next: nextTurn };
  } catch (error) {
    console.error("[actions/game/advanceLocalTurn]", error);
    return { success: false, error: "No se pudo avanzar el turno" };
  }
}

const LocalVoteCastSchema = z.object({
  voterNum: z.number().int().min(1),
  targetNum: z.number().int().min(1),
});

export async function castLocalVote(raw: unknown) {
  try {
    const parsed = LocalVoteCastSchema.parse(raw);
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("local_votes, local_roles, current_local_turn")
      .eq("id", GAME_SESSION_ID)
      .maybeSingle();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    // Filtrar jugadores vivos
    const aliveRoles = (session.local_roles || []).filter((r: any) => r.is_alive !== false);

    // Encontrar indice del votante actual en la lista de vivos
    const currentIndex = aliveRoles.findIndex((r: any) => r.turn === parsed.voterNum);

    const votes: Record<string, number> = {
      ...(session.local_votes || {}),
      [String(parsed.voterNum)]: parsed.targetNum,
    };

    // Calcular siguiente vivo
    const nextRole = aliveRoles[currentIndex + 1];
    const isLastVoter = currentIndex + 1 >= aliveRoles.length;

    const nextVoter = isLastVoter ? 1 : nextRole.turn;

    const { error } = await supabase
      .from("game_sessions")
      .update({
        local_votes: votes,
        current_local_turn: isLastVoter ? 1 : nextVoter,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true, isLastVoter, votes };
  } catch (error) {
    console.error("[actions/game/castLocalVote]", error);
    return { success: false, error: "No se pudo registrar el voto" };
  }
}

const ResolveLocalVotesSchema = z.object({
  requestingNickname: z.string().min(1),
  tiedNums: z.array(z.number()).optional(),
});

export async function resolveLocalVotes(raw: unknown) {
  try {
    const parsed = ResolveLocalVotesSchema.parse(raw);
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("local_votes, local_roles, local_player_count, current_round")
      .eq("id", GAME_SESSION_ID)
      .maybeSingle();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const votes: Record<string, number> = session.local_votes || {};
    const tally: Record<number, number> = {};

    const candidateNums = parsed.tiedNums ?? null;

    for (const [, targetNum] of Object.entries(votes)) {
      if (candidateNums && !candidateNums.includes(targetNum)) continue;
      tally[targetNum] = (tally[targetNum] || 0) + 1;
    }

    const maxVotes = Math.max(...Object.values(tally), 0);
    const topCandidates = Object.entries(tally)
      .filter(([, v]) => v === maxVotes)
      .map(([k]) => Number(k));

    if (topCandidates.length > 1) {
      // Tie — go to tiebreak with only tied player numbers
      const { error } = await supabase
        .from("game_sessions")
        .update({
          state: "tiebreak",
          local_votes: {},
          current_local_turn: 1,
          local_tiebreak_candidates: topCandidates,
        })
        .eq("id", GAME_SESSION_ID);
      if (error) throw error;
      return { success: true, tie: true, tiedNums: topCandidates };
    }

    const eliminatedNum = topCandidates[0] ?? null;

    if (!eliminatedNum) {
      // No votes — skip to round_end
      const { error } = await supabase
        .from("game_sessions")
        .update({ state: "round_end" })
        .eq("id", GAME_SESSION_ID);
      if (error) throw error;
      return { success: true, eliminatedNum: null };
    }

    // Mark player as eliminated in local_roles
    const roles = (session.local_roles || []).map((r: any) =>
      r.turn === eliminatedNum ? { ...r, is_alive: false } : r
    );

    // Check win condition
    const alivePlayers = roles.filter((r: { is_alive?: boolean }) => r.is_alive !== false);
    const aliveImpostors = alivePlayers.filter((r: { role: string }) => r.role === "impostor");
    const aliveInnocents = alivePlayers.filter((r: { role: string }) => r.role === "innocent");

    let winner: string | null = null;
    if (aliveImpostors.length === 0) winner = "innocents";
    else if (alivePlayers.length === 2 && aliveImpostors.length === 1) winner = "impostors";
    else if (aliveImpostors.length / alivePlayers.length >= 0.6) winner = "impostors";

    const { error } = await supabase
      .from("game_sessions")
      .update({
        local_roles: roles,
        local_votes: {},
        current_local_turn: 1,
        state: winner ? "game_over" : "round_end",
        winner,
        eliminated_this_round: eliminatedNum,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true, eliminatedNum, winner };
  } catch (error) {
    console.error("[actions/game/resolveLocalVotes]", error);
    return { success: false, error: "No se pudo resolver la votación" };
  }
}

const NextRoundSchema = z.object({
  requestingNickname: z.string().min(1),
  skipHints: z.boolean().optional(),
});

export async function startNextLocalRound(raw: unknown) {
  try {
    const parsed = NextRoundSchema.parse(raw);
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("current_round, local_player_count")
      .eq("id", GAME_SESSION_ID)
      .maybeSingle();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: parsed.skipHints ? "voting" : "hints",
        current_round: (session.current_round || 1) + 1,
        current_local_turn: 1,
        local_hint_done: [],
        local_votes: {},
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/game/startNextLocalRound]", error);
    return { success: false, error: "No se pudo iniciar la siguiente ronda" };
  }
}

const NewPartidaSchema = z.object({ requestingNickname: z.string().min(1) });

export async function startNewPartida(raw: unknown) {
  try {
    const parsed = NewPartidaSchema.parse(raw);
    const supabase = await createSupabaseServer();

    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: "lobby",
        current_round: 0,
        current_local_turn: 1,
        local_roles: [],
        local_hint_done: [],
        local_votes: {},
        winner: null,
        current_card_id: null,
        current_turn_player_id: null,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/game/startNewPartida]", error);
    return { success: false, error: "No se pudo iniciar nueva partida" };
  }
}

export async function endGame(raw: unknown) {
  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: "lobby",
        current_round: 0,
        current_local_turn: 1,
        local_roles: [],
        local_hint_done: [],
        local_votes: {},
        winner: null,
        current_card_id: null,
        partida_number: 0,
        used_card_ids: [],
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/game/endGame]", error);
    return { success: false, error: "No se pudo terminar el juego" };
  }
}
