"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { resolveImpostorCount, assignRoles, shouldTriggerModifier, drawCard, checkWinCondition, resolveVote } from "@/lib/game-engine";
import { GAME_SESSION_ID } from "@/lib/utils";
import type { LocalPlayerRole } from "@/types";

// ─── Start local game ────────────────────────────────────────────────────────

export async function startLocalGame(requestingNickname: string): Promise<{
  success: boolean;
  error?: string;
  playerCount?: number;
}> {
  try {
    const supabase = await createSupabaseServer();

    // Verify requester is host
    const { data: host } = await supabase
      .from("players")
      .select("id, is_host")
      .ilike("nickname", requestingNickname)
      .maybeSingle();

    if (!host?.is_host) {
      return { success: false, error: "Solo el anfitrión puede iniciar la partida" };
    }

    // Load session config
    const { data: session } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", GAME_SESSION_ID)
      .single();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const playerCount = session.local_player_count || 4;

    // Load active cards
    const { data: cards } = await supabase
      .from("cards")
      .select("id, name, hint, image_url")
      .eq("is_active", true);

    if (!cards || cards.length === 0) {
      return { success: false, error: "No hay cartas activas. Agrega cartas en la configuración." };
    }

    // Resolve impostor count
    let impostorCount = resolveImpostorCount(session, playerCount);
    let allImpostorsTriggered = false;
    let allDifferentTriggered = false;

    if (session.modifier_all_impostors && shouldTriggerModifier(Number(session.modifier_all_impostors_prob || 0))) {
      impostorCount = playerCount;
      allImpostorsTriggered = true;
    }

    if (session.modifier_all_different && shouldTriggerModifier(Number(session.modifier_all_different_prob || 0))) {
      allDifferentTriggered = true;
    }

    // Build fake player objects just for role assignment (no DB rows)
    const fakePlayers = Array.from({ length: playerCount }, (_, i) => ({ id: String(i + 1) }));
    const recentIds = (session.recent_impostor_ids || []).map(String);
    const { impostors } = allImpostorsTriggered
      ? { impostors: fakePlayers.map((p) => p.id) }
      : assignRoles(fakePlayers, impostorCount, recentIds);

    // Draw card(s)
    const usedCardIds: string[] = session.used_card_ids || [];
    const innocentCard = allDifferentTriggered ? null : drawCard(cards, usedCardIds);
    const shuffledCards = allDifferentTriggered ? [...cards].sort(() => Math.random() - 0.5) : [];
    const newUsedIds: string[] = [];

    // Build local_roles array
    const localRoles: LocalPlayerRole[] = fakePlayers.map((p, i) => {
      const isImpostor = impostors.includes(p.id);
      let card: typeof cards[0];

      if (allDifferentTriggered) {
        card = shuffledCards[i % shuffledCards.length];
      } else {
        card = isImpostor ? drawCard(cards, usedCardIds) : innocentCard!;
      }

      newUsedIds.push(card.id);

      return {
        turn: i + 1,
        role: isImpostor ? "impostor" : "innocent",
        card_id: card.id,
        card_name: card.name,
        card_hint: card.hint,
        card_image_url: card.image_url,
        is_alive: true,
      };
    });

    const updatedUsedIds = Array.from(new Set([...usedCardIds, ...newUsedIds]));

    const updatePayload: Record<string, unknown> = {
      state: "dealing",
      current_local_turn: 1,
      local_roles: localRoles,
      local_votes: {},
      current_round: 1,
      eliminated_this_round: null,
      winner: null,
      partida_number: (session.partida_number || 0) + 1,
      used_card_ids: updatedUsedIds,
      recent_impostor_ids: impostors,
      current_card_id: innocentCard?.id ?? null,
    };

    if (allImpostorsTriggered) updatePayload.modifier_all_impostors_prob = 0;
    if (allDifferentTriggered) updatePayload.modifier_all_different_prob = 0;

    const { error } = await supabase
      .from("game_sessions")
      .update(updatePayload)
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;

    return { success: true, playerCount };
  } catch (err) {
    console.error("[actions/localGame/startLocalGame]", err);
    return { success: false, error: "No se pudo iniciar la partida" };
  }
}

// ─── Advance dealing turn ─────────────────────────────────────────────────────
// Called after a player reveals their card and clicks "Pasar al siguiente jugador"

export async function advanceDealingTurn(): Promise<{
  success: boolean;
  error?: string;
  next?: "dealing" | "hints";
}> {
  try {
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("current_local_turn, local_player_count, local_roles")
      .eq("id", GAME_SESSION_ID)
      .single();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const { current_local_turn, local_player_count } = session;
    const isLast = current_local_turn >= local_player_count;

    if (isLast) {
      // All players have seen their card → move to hints phase
      // Reset hint_given flags
      const roles: LocalPlayerRole[] = (session.local_roles || []).map((r: LocalPlayerRole) => ({
        ...r,
        hint_given: false,
      }));

      const { error } = await supabase
        .from("game_sessions")
        .update({ state: "hints", current_local_turn: 1, local_roles: roles })
        .eq("id", GAME_SESSION_ID);

      if (error) throw error;
      return { success: true, next: "hints" };
    }

    // Advance to next player
    const { error } = await supabase
      .from("game_sessions")
      .update({ current_local_turn: current_local_turn + 1 })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true, next: "dealing" };
  } catch (err) {
    console.error("[actions/localGame/advanceDealingTurn]", err);
    return { success: false, error: "Error al pasar turno" };
  }
}

// ─── Advance hints turn ───────────────────────────────────────────────────────
// Called after current player "confirms" they gave their hint

export async function advanceHintsTurn(): Promise<{
  success: boolean;
  error?: string;
  next?: "hints" | "voting";
}> {
  try {
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("current_local_turn, local_player_count, local_roles")
      .eq("id", GAME_SESSION_ID)
      .single();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const { current_local_turn, local_player_count, local_roles } = session;

    // Find next alive player after current turn
    const roles: LocalPlayerRole[] = local_roles || [];
    const alivePlayers = roles.filter((r: LocalPlayerRole) => r.is_alive);

    // Mark current as hint given
    const updatedRoles = roles.map((r: LocalPlayerRole) =>
      r.turn === current_local_turn ? { ...r, hint_given: true } : r
    );

    // Find next alive player's turn number
    const currentIndex = alivePlayers.findIndex((r) => r.turn === current_local_turn);
    const nextAlive = alivePlayers[(currentIndex + 1) % alivePlayers.length];
    const isLastAlive = currentIndex === alivePlayers.length - 1;

    // Check if all alive players have given hints
    const allGiven = updatedRoles
      .filter((r: LocalPlayerRole) => r.is_alive)
      .every((r: LocalPlayerRole) => r.hint_given);

    if (allGiven || isLastAlive) {
      // Reset hint_given for next round, move to voting
      const resetRoles = updatedRoles.map((r: LocalPlayerRole) => ({ ...r, hint_given: false }));
      const { error } = await supabase
        .from("game_sessions")
        .update({
          state: "voting",
          current_local_turn: alivePlayers[0]?.turn ?? 1,
          local_roles: resetRoles,
          local_votes: {},
        })
        .eq("id", GAME_SESSION_ID);

      if (error) throw error;
      return { success: true, next: "voting" };
    }

    const { error } = await supabase
      .from("game_sessions")
      .update({
        current_local_turn: nextAlive.turn,
        local_roles: updatedRoles,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true, next: "hints" };
  } catch (err) {
    console.error("[actions/localGame/advanceHintsTurn]", err);
    return { success: false, error: "Error al avanzar turno de pistas" };
  }
}

// ─── Cast local vote ──────────────────────────────────────────────────────────

export async function castLocalVote(voterTurn: number, targetTurn: number): Promise<{
  success: boolean;
  error?: string;
  next?: "voting" | "tiebreak" | "round_end" | "game_over";
  eliminated?: number | null;
  tiedTurns?: number[];
  winner?: string | null;
}> {
  try {
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("current_local_turn, local_player_count, local_roles, local_votes, current_round")
      .eq("id", GAME_SESSION_ID)
      .single();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const roles: LocalPlayerRole[] = session.local_roles || [];
    const alivePlayers = roles.filter((r: LocalPlayerRole) => r.is_alive);
    const votes: Record<string, number> = { ...(session.local_votes || {}), [String(voterTurn)]: targetTurn };

    // Find next alive voter
    const currentIndex = alivePlayers.findIndex((r) => r.turn === voterTurn);
    const isLastVoter = currentIndex === alivePlayers.length - 1;

    if (!isLastVoter) {
      // Just save vote and advance to next voter
      const nextTurn = alivePlayers[currentIndex + 1].turn;
      const { error } = await supabase
        .from("game_sessions")
        .update({ local_votes: votes, current_local_turn: nextTurn })
        .eq("id", GAME_SESSION_ID);

      if (error) throw error;
      return { success: true, next: "voting" };
    }

    // Last voter — resolve votes
    const voteCounts: Record<string, number> = {};
    for (const target of Object.values(votes)) {
      voteCounts[String(target)] = (voteCounts[String(target)] || 0) + 1;
    }

    const maxVotes = Math.max(...Object.values(voteCounts));
    const topTargets = Object.keys(voteCounts).filter((k) => voteCounts[k] === maxVotes);

    if (topTargets.length > 1) {
      // Tie — tiebreak with only those players
      const tiedTurns = topTargets.map(Number);
      const { error } = await supabase
        .from("game_sessions")
        .update({
          state: "tiebreak",
          local_votes: {},
          current_local_turn: alivePlayers[0].turn,
          // Store tied turns temporarily in eliminated_this_round as a signal
          // We'll use local_votes shape to track tiebreak candidates separately
          local_roles: roles.map((r) => ({
            ...r,
            in_tiebreak: tiedTurns.includes(r.turn),
          })),
        })
        .eq("id", GAME_SESSION_ID);

      if (error) throw error;
      return { success: true, next: "tiebreak", tiedTurns };
    }

    // Eliminate the player with most votes
    const eliminatedTurn = Number(topTargets[0]);
    const updatedRoles = roles.map((r: LocalPlayerRole) =>
      r.turn === eliminatedTurn ? { ...r, is_alive: false } : r
    );

    // Check win condition
    const aliveAfter = updatedRoles.filter((r: LocalPlayerRole) => r.is_alive);
    const winResult = checkWinCondition(
      aliveAfter.map((r) => ({ role: r.role, is_alive: true }))
    );

    if (winResult) {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          state: "game_over",
          local_roles: updatedRoles,
          local_votes: votes,
          eliminated_this_round: eliminatedTurn,
          winner: winResult,
        })
        .eq("id", GAME_SESSION_ID);

      if (error) throw error;
      return { success: true, next: "game_over", eliminated: eliminatedTurn, winner: winResult };
    }

    // No winner yet — round_end
    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: "round_end",
        local_roles: updatedRoles,
        local_votes: votes,
        eliminated_this_round: eliminatedTurn,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true, next: "round_end", eliminated: eliminatedTurn };
  } catch (err) {
    console.error("[actions/localGame/castLocalVote]", err);
    return { success: false, error: "Error al registrar voto" };
  }
}

// ─── Continue after round end ─────────────────────────────────────────────────

export async function continueAfterRound(choice: "hints" | "voting"): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServer();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("local_roles, current_round")
      .eq("id", GAME_SESSION_ID)
      .single();

    if (!session) return { success: false, error: "Sesión no encontrada" };

    const roles: LocalPlayerRole[] = session.local_roles || [];
    const firstAlive = roles.find((r: LocalPlayerRole) => r.is_alive);

    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: choice,
        current_local_turn: firstAlive?.turn ?? 1,
        local_votes: {},
        current_round: (session.current_round || 1) + (choice === "hints" ? 1 : 0),
        eliminated_this_round: null,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("[actions/localGame/continueAfterRound]", err);
    return { success: false, error: "Error al continuar" };
  }
}

// ─── Start new partida (same session) ─────────────────────────────────────────

export async function startNewPartida(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServer();

    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: "lobby",
        local_roles: [],
        local_votes: {},
        current_local_turn: 1,
        current_round: 0,
        eliminated_this_round: null,
        winner: null,
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("[actions/localGame/startNewPartida]", err);
    return { success: false, error: "Error al reiniciar" };
  }
}

// ─── End game session entirely ────────────────────────────────────────────────

export async function endGameSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServer();

    const { error } = await supabase
      .from("game_sessions")
      .update({
        state: "lobby",
        local_roles: [],
        local_votes: {},
        current_local_turn: 1,
        current_round: 0,
        eliminated_this_round: null,
        winner: null,
        partida_number: 0,
        used_card_ids: [],
      })
      .eq("id", GAME_SESSION_ID);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("[actions/localGame/endGameSession]", err);
    return { success: false, error: "Error al terminar el juego" };
  }
}
