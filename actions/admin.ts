"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ADMIN_NICKNAME, GAME_SESSION_ID } from "@/lib/utils";

const CardActionSchema = z.object({
  requestingNickname: z.string().min(1),
  cardId: z.string().uuid(),
});

const CreateCardSchema = z.object({
  requestingNickname: z.string().min(1),
  name: z.string().min(1),
  hint: z.string().optional(),
});

const UpdateCardSchema = z.object({
  requestingNickname: z.string().min(1),
  cardId: z.string().uuid(),
  name: z.string().min(1),
  hint: z.string().optional(),
});

const PlayerActionSchema = z.object({
  requestingNickname: z.string().min(1),
  targetNickname: z.string().min(1),
});

function requireAdmin(requestingNickname: string) {
  if (requestingNickname !== ADMIN_NICKNAME) {
    throw new Error("No tienes permisos para hacer esto");
  }
}

export async function createCard(raw: unknown) {
  try {
    const parsed = CreateCardSchema.parse(raw);
    requireAdmin(parsed.requestingNickname);

    const supabase = await createSupabaseServer();
    const { error, data } = await supabase.from("cards").insert({
      name: parsed.name,
      hint: parsed.hint || null,
      is_active: true,
    }).select("id, name, hint, is_active").single();

    if (error) throw error;
    return { success: true, card: data };
  } catch (error) {
    console.error("[actions/admin/createCard]", error);
    return { success: false, error: "No se pudo crear la carta" };
  }
}

export async function updateCard(raw: unknown) {
  try {
    const parsed = UpdateCardSchema.parse(raw);
    requireAdmin(parsed.requestingNickname);

    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from("cards")
      .update({ name: parsed.name, hint: parsed.hint || null })
      .eq("id", parsed.cardId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/admin/updateCard]", error);
    return { success: false, error: "No se pudo actualizar la carta" };
  }
}

export async function deleteCard(raw: unknown) {
  try {
    const parsed = CardActionSchema.parse(raw);
    requireAdmin(parsed.requestingNickname);

    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from("cards")
      .update({ is_active: false })
      .eq("id", parsed.cardId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/admin/deleteCard]", error);
    return { success: false, error: "No se pudo eliminar la carta" };
  }
}

export async function deletePlayer(raw: unknown) {
  try {
    const parsed = PlayerActionSchema.parse(raw);
    requireAdmin(parsed.requestingNickname);
    if (parsed.targetNickname === ADMIN_NICKNAME) {
      return { success: false, error: "No puedes eliminar al administrador" };
    }

    const supabase = await createSupabaseServer();
    const { data: player, error: fetchError } = await supabase
      .from("players")
      .select("id")
      .ilike("nickname", parsed.targetNickname)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!player) {
      return { success: false, error: "Jugador no encontrado" };
    }

    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/admin/deletePlayer]", error);
    return { success: false, error: "No se pudo eliminar el jugador" };
  }
}

export async function forceLeavePlayer(raw: unknown) {
  try {
    const parsed = PlayerActionSchema.parse(raw);
    requireAdmin(parsed.requestingNickname);
    if (parsed.targetNickname === ADMIN_NICKNAME) {
      return { success: false, error: "No puedes expulsar al administrador" };
    }

    const supabase = await createSupabaseServer();
    const { data: player, error: fetchError } = await supabase
      .from("players")
      .select("id, is_host")
      .ilike("nickname", parsed.targetNickname)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!player) {
      return { success: false, error: "Jugador no encontrado" };
    }

    const updates: any = { is_in_lobby: false };
    if (player.is_host) {
      updates.is_host = false;
    }

    const { error: updateError } = await supabase.from("players").update(updates).eq("id", player.id);
    if (updateError) throw updateError;

    const { error: gameError } = await supabase
      .from("game_players")
      .update({ is_alive: false })
      .eq("session_id", GAME_SESSION_ID)
      .eq("player_id", player.id);

    if (gameError) throw gameError;
    return { success: true };
  } catch (error) {
    console.error("[actions/admin/forceLeavePlayer]", error);
    return { success: false, error: "No se pudo expulsar al jugador" };
  }
}
