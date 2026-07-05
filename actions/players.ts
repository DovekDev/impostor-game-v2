"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ADMIN_NICKNAME, DEFAULT_HOST_NICKNAME } from "@/lib/utils";

const JoinSchema = z.object({
  nickname: z
    .string()
    .min(2, "El nickname debe tener al menos 2 caracteres")
    .max(20, "El nickname no puede tener más de 20 caracteres")
    .regex(
      /^[a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑüÜ ]+$/,
      "Solo letras, números, espacios y guiones"
    ),
});

type JoinResult = {
  success: boolean;
  error?: string;
  isHost?: boolean;
  isAdmin?: boolean;
};

export async function joinLobby(rawNickname: unknown): Promise<JoinResult> {
  try {
    const parsed = JoinSchema.safeParse({ nickname: rawNickname });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { nickname } = parsed.data;
    const supabase = await createSupabaseServer();

    // Check for duplicate nickname among currently in-lobby players
    const { data: existing } = await supabase
      .from("players")
      .select("id, nickname, is_in_lobby")
      .ilike("nickname", nickname)
      .eq("is_in_lobby", true)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "Ese nickname ya está en uso en la sala",
      };
    }

    // Check if player already exists (has played before)
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("id, is_host, is_admin")
      .ilike("nickname", nickname)
      .maybeSingle();

    const isAdmin = nickname === ADMIN_NICKNAME;

    if (existingPlayer) {
      // Player exists — update to in_lobby and refresh last_seen_at
      const { error } = await supabase
        .from("players")
        .update({ is_in_lobby: true, last_seen_at: new Date().toISOString() })
        .eq("id", existingPlayer.id);

      if (error) throw error;

      return {
        success: true,
        isHost: existingPlayer.is_host,
        isAdmin: existingPlayer.is_admin,
      };
    }

    // New player — insert
    const { data: currentHost } = await supabase
      .from("players")
      .select("id")
      .eq("is_host", true)
      .maybeSingle();

    const shouldBeHost = !currentHost && nickname === DEFAULT_HOST_NICKNAME;

    const { error: insertError } = await supabase.from("players").insert({
      nickname,
      is_host: shouldBeHost,
      is_admin: isAdmin,
      is_in_lobby: true,
      last_seen_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return { success: true, isHost: shouldBeHost, isAdmin };
  } catch (error) {
    console.error("[actions/players/joinLobby]", error);
    return { success: false, error: "No se pudo unir a la sala" };
  }
}

export async function restoreLobbyPresence(nickname: string): Promise<{ success: boolean; isHost?: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServer();

    const { data: existingPlayer, error: fetchError } = await supabase
      .from("players")
      .select("id, is_host, is_admin")
      .ilike("nickname", nickname)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingPlayer) {
      return { success: false, error: "No se encontró el jugador." };
    }

    const { error: updateError } = await supabase
      .from("players")
      .update({ is_in_lobby: true, last_seen_at: new Date().toISOString() })
      .eq("id", existingPlayer.id);

    if (updateError) throw updateError;

    return { success: true, isHost: existingPlayer.is_host };
  } catch (error) {
    console.error("[actions/players/restoreLobbyPresence]", error);
    return { success: false, error: "No se pudo restaurar la presencia en la sala." };
  }
}

export async function leaveLobby(nickname: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from("players")
      .update({ is_in_lobby: false })
      .ilike("nickname", nickname);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[actions/players/leaveLobby]", error);
    return { success: false };
  }
}

export async function setHost(
  targetNickname: string,
  requestingNickname: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only admin can force-assign host
    if (requestingNickname !== ADMIN_NICKNAME) {
      return { success: false, error: "No tienes permisos para hacer esto" };
    }

    const supabase = await createSupabaseServer();

    // Clear current host
    const { error: clearError } = await supabase
      .from("players")
      .update({ is_host: false })
      .eq("is_host", true);

    if (clearError) throw clearError;

    // Set new host
    const { error: setError } = await supabase
      .from("players")
      .update({ is_host: true })
      .ilike("nickname", targetNickname);

    if (setError) throw setError;

    return { success: true };
  } catch (error) {
    console.error("[actions/players/setHost]", error);
    return { success: false, error: "No se pudo cambiar el anfitrión" };
  }
}
