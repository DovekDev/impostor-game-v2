"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";

const CardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  is_active: z.boolean(),
});

const SessionSchema = z.object({
  mode: z.enum(["local", "online"]),
  local_player_count: z.number().min(1).max(12).optional(),
  impostor_count_mode: z.enum(["fixed", "random"]),
  impostor_count_fixed: z.number().min(1).max(6),
  impostor_count_min: z.number().min(1).max(6),
  impostor_count_max: z.number().min(1).max(10),
  modifier_all_impostors: z.boolean(),
  modifier_all_impostors_prob: z.number().min(0).max(1),
  modifier_all_different: z.boolean(),
  modifier_all_different_prob: z.number().min(0).max(1),
  modifier_impostor_hints: z.boolean(),
  cards: z.array(CardSchema).optional(),
  deleted_card_ids: z.array(z.string().uuid()).optional(),
});

export async function saveSessionConfig(raw: unknown) {
  try {
    const parsed = SessionSchema.parse(raw);
    const supabase = await createSupabaseServer();

    const upsertPayload: Record<string, unknown> = {
      id: "00000000-0000-0000-0000-000000000001",
      mode: parsed.mode,
      impostor_count_mode: parsed.impostor_count_mode,
      impostor_count_fixed: parsed.impostor_count_fixed,
      impostor_count_min: parsed.impostor_count_min,
      impostor_count_max: parsed.impostor_count_max,
      modifier_all_impostors: parsed.modifier_all_impostors,
      modifier_all_impostors_prob: parsed.modifier_all_impostors_prob,
      modifier_all_different: parsed.modifier_all_different,
      modifier_all_different_prob: parsed.modifier_all_different_prob,
      modifier_impostor_hints: parsed.modifier_impostor_hints,
    };

    if (parsed.mode === "local" && parsed.local_player_count !== undefined) {
      upsertPayload.local_player_count = parsed.local_player_count;
    }

    const { error: sessionError } = await supabase.from("game_sessions").upsert(upsertPayload, { onConflict: "id" });
    if (sessionError) throw sessionError;

    if (parsed.cards && parsed.cards.length > 0) {
      const { error: cardsError } = await supabase.from("cards").upsert(parsed.cards, { onConflict: "id" });
      if (cardsError) throw cardsError;
    }

    if (parsed.deleted_card_ids && parsed.deleted_card_ids.length > 0) {
      const { error: deleteError } = await supabase
        .from("cards")
        .update({ is_active: false })
        .in("id", parsed.deleted_card_ids);
      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error("[actions/sessions/saveSessionConfig]", error);
    return { success: false, error: "No se pudo guardar la configuración" };
  }
}
