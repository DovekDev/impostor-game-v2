"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { saveSessionConfig } from "@/actions/sessions";

type GameConfigPanelProps = {
  onClose: () => void;
};

type CardItem = {
  id: string;
  name: string;
  active: boolean;
};

type LobbyPlayer = {
  id: string;
  nickname: string;
  is_host: boolean;
};

export function GameConfigPanel({ onClose }: GameConfigPanelProps) {
  const [mode, setMode] = useState<"local" | "online">("online");
  const [impostorMode, setImpostorMode] = useState<"fixed" | "random">("fixed");
  const [fixedCount, setFixedCount] = useState(1);
  const [randomMin, setRandomMin] = useState(1);
  const [randomMax, setRandomMax] = useState(2);
  const [modifiers, setModifiers] = useState({
    allImpostors: false,
    allDifferent: false,
    impostorHints: true,
  });
  const [localPlayerCount, setLocalPlayerCount] = useState(4);
  const [allImpostorsProb, setAllImpostorsProb] = useState(20);
  const [allDifferentProb, setAllDifferentProb] = useState(30);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [deletedCardIds, setDeletedCardIds] = useState<string[]>([]);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const [{ data: session }, { data: cardsData }, { data: playersData }] = await Promise.all([
          supabase
            .from("game_sessions")
            .select(
              "mode, local_player_count, impostor_count_mode, impostor_count_fixed, impostor_count_min, impostor_count_max, modifier_all_impostors, modifier_all_impostors_prob, modifier_all_different, modifier_all_different_prob, modifier_impostor_hints"
            )
            .maybeSingle(),
          supabase.from("cards").select("id, name, is_active").order("created_at", { ascending: true }),
          supabase.from("players").select("id, nickname, is_host").eq("is_in_lobby", true).order("created_at", { ascending: true }),
        ]);

        if (session) {
          setMode(session.mode);
          setImpostorMode(session.impostor_count_mode);
          setFixedCount(session.impostor_count_fixed);
          setRandomMin(session.impostor_count_min);
          setRandomMax(session.impostor_count_max);
          setLocalPlayerCount(session.local_player_count ?? 4);
          setModifiers({
            allImpostors: session.modifier_all_impostors,
            allDifferent: session.modifier_all_different,
            impostorHints: session.modifier_impostor_hints,
          });
          setAllImpostorsProb(Math.round((session.modifier_all_impostors_prob ?? 0) * 100));
          setAllDifferentProb(Math.round((session.modifier_all_different_prob ?? 0) * 100));
        }

        setCards(
          (cardsData ?? []).map((card) => ({
            id: card.id,
            name: card.name,
            active: Boolean(card.is_active),
          }))
        );
        setPlayers(playersData ?? []);
      } catch (err) {
        console.error("[GameConfigPanel/loadConfig]", err);
        setError("No se pudo cargar la configuración de juego.");
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const activeCardsCount = cards.filter((card) => card.active).length;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center px-4 pb-4 md:pb-0">
      <div
        className="w-full max-w-3xl overflow-hidden rounded-t-3xl bg-surface border border-border shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:rounded-3xl md:max-h-[90vh] md:pb-0"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-secondary">
          <div>
            <p className="text-text-secondary text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-display)" }}>
              Configuración de Juego
            </p>
            <h2 className="text-text-primary mt-2 text-2xl uppercase" style={{ fontFamily: "var(--font-display)" }}>
              Ajustes del Lobby
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text-secondary transition hover:bg-surface-muted"
            aria-label="Cerrar panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto px-5 py-6 md:px-8 md:py-8">
          {loading ? (
            <div className="rounded-3xl border border-border bg-background p-6 text-center">
              <p className="text-text-secondary">Cargando configuración...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-3xl border border-danger bg-danger-muted p-4 text-danger">
                  {error}
                </div>
              )}

              <section className="mb-6 rounded-3xl border border-border bg-background p-5">
                <p className="text-accent text-xs uppercase tracking-[0.3em] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Modo de juego
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { value: "local", label: "Local" },
                    { value: "online", label: "Online" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value as "local" | "online")}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        mode === option.value
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-surface text-text-primary hover:border-accent"
                      }`}
                    >
                      <p className="font-display uppercase tracking-wide">{option.label}</p>
                      <p className="text-text-secondary text-xs mt-1">
                        {option.value === "local" ? "Modo de juego local sin chat." : "Modo de juego online con chat."}
                      </p>
                    </button>
                  ))}
                </div>
                {mode === "local" && (
                  <div className="mt-4 rounded-2xl bg-surface p-4">
                    <p className="text-text-secondary text-sm mb-2">Jugadores por partida (modo local)</p>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      value={localPlayerCount}
                      onChange={(e) => setLocalPlayerCount(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="mt-2 text-text-primary text-sm">Seleccionado: {localPlayerCount}</div>
                  </div>
                )}
              </section>

              <section className="mb-6 rounded-3xl border border-border bg-background p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-accent text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-display)" }}>
                      Cartas
                    </p>
                    <p className="text-text-secondary text-xs">{activeCardsCount} cartas activas</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-xs uppercase tracking-[0.24em] text-accent-foreground transition hover:bg-accent-dark"
                    onClick={() => {
                      const newCard = { id: crypto.randomUUID(), name: `Carta ${cards.length + 1}`, active: true };
                      setCards((current) => [newCard, ...current]);
                    }}
                  >
                    <Plus size={14} /> Agregar carta
                  </button>
                </div>
                <div className="space-y-3">
                  {cards.map((card) => (
                    <div key={card.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-display uppercase tracking-wide text-text-primary">{card.name}</p>
                        <p className="text-text-secondary text-xs">{card.active ? "Activo en la baraja" : "Inactivo"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCards((current) => current.map((x) => (x.id === card.id ? { ...x, active: !x.active } : x)))}
                          className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em] transition ${
                            card.active ? "bg-success text-success-foreground" : "bg-surface-secondary text-text-secondary"
                          }`}
                        >
                          {card.active ? "Activo" : "Inactivo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCards((current) => current.filter((x) => x.id !== card.id));
                            setDeletedCardIds((current) => [...current, card.id]);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary text-text-secondary transition hover:bg-surface-muted"
                          aria-label={`Eliminar ${card.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-6 rounded-3xl border border-border bg-background p-5">
                <p className="text-accent text-xs uppercase tracking-[0.3em] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Cantidad de impostores
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                    <input
                      type="radio"
                      checked={impostorMode === "fixed"}
                      onChange={() => setImpostorMode("fixed")}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="font-display uppercase tracking-wide">Cantidad fija</span>
                  </label>
                  {impostorMode === "fixed" && (
                    <div className="rounded-2xl bg-surface p-4">
                      <p className="text-text-secondary text-sm mb-2">Impostores fijos</p>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        value={fixedCount}
                        onChange={(e) => setFixedCount(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="mt-2 text-text-primary text-sm">Seleccionado: {fixedCount}</div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                    <input
                      type="radio"
                      checked={impostorMode === "random"}
                      onChange={() => setImpostorMode("random")}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="font-display uppercase tracking-wide">Cantidad aleatoria</span>
                  </label>
                  {impostorMode === "random" && (
                    <div className="rounded-2xl bg-surface p-4 space-y-4">
                      <div>
                        <p className="text-text-secondary text-sm mb-2">Mínimo</p>
                        <input
                          type="range"
                          min={1}
                          max={4}
                          value={randomMin}
                          onChange={(e) => setRandomMin(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                        <div className="mt-2 text-text-primary text-sm">Min: {randomMin}</div>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm mb-2">Máximo</p>
                        <input
                          type="range"
                          min={randomMin}
                          max={6}
                          value={randomMax}
                          onChange={(e) => setRandomMax(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                        <div className="mt-2 text-text-primary text-sm">Max: {randomMax}</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="mb-6 rounded-3xl border border-border bg-background p-5">
                <p className="text-accent text-xs uppercase tracking-[0.3em] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Modificadores
                </p>
                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
                    <div>
                      <p className="font-display uppercase tracking-wide text-text-primary">Todos impostores</p>
                      <p className="text-text-secondary text-xs mt-1">Probabilidad de que todos sean impostores.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={modifiers.allImpostors}
                      onChange={(e) => setModifiers((prev) => ({ ...prev, allImpostors: e.target.checked }))}
                      className="h-4 w-4 accent-accent"
                    />
                  </label>
                  {modifiers.allImpostors && (
                    <div className="rounded-2xl bg-surface p-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={allImpostorsProb}
                        onChange={(e) => setAllImpostorsProb(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <p className="mt-2 text-sm text-text-primary">Probabilidad: {allImpostorsProb}%</p>
                    </div>
                  )}

                  <label className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
                    <div>
                      <p className="font-display uppercase tracking-wide text-text-primary">Todos con cartas diferentes</p>
                      <p className="text-text-secondary text-xs mt-1">Probabilidad de que cada jugador reciba carta distinta.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={modifiers.allDifferent}
                      onChange={(e) => setModifiers((prev) => ({ ...prev, allDifferent: e.target.checked }))}
                      className="h-4 w-4 accent-accent"
                    />
                  </label>
                  {modifiers.allDifferent && (
                    <div className="rounded-2xl bg-surface p-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={allDifferentProb}
                        onChange={(e) => setAllDifferentProb(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <p className="mt-2 text-sm text-text-primary">Probabilidad: {allDifferentProb}%</p>
                    </div>
                  )}

                  <label className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
                    <div>
                      <p className="font-display uppercase tracking-wide text-text-primary">Pistas para impostores</p>
                      <p className="text-text-secondary text-xs mt-1">Impostores reciben una pista adicional.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={modifiers.impostorHints}
                      onChange={(e) => setModifiers((prev) => ({ ...prev, impostorHints: e.target.checked }))}
                      className="h-4 w-4 accent-accent"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-background p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-accent text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-display)" }}>
                    Jugadores
                  </p>
                  <span className="rounded-full bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-text-secondary">
                    {players.length} en lista
                  </span>
                </div>
                <div className="space-y-3">
                  {players.length === 0 ? (
                    <div className="rounded-3xl border border-border bg-surface p-4 text-text-secondary">No hay jugadores en la sala.</div>
                  ) : (
                    players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between rounded-3xl border border-border bg-surface p-3">
                        <div>
                          <p className="font-display uppercase tracking-wide text-text-primary">{player.nickname}</p>
                          <p className="text-text-secondary text-xs uppercase tracking-[0.2em]">
                            {player.is_host ? "Anfitrión actual" : "Jugador"}
                          </p>
                        </div>
                        {player.is_host ? (
                          <span className="rounded-full bg-accent-muted px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-accent">
                            Host
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="px-5 pb-6 md:px-8 md:pb-8">
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving || loading}
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await saveSessionConfig({
                    mode,
                    impostor_count_mode: impostorMode,
                    impostor_count_fixed: fixedCount,
                    impostor_count_min: randomMin,
                    impostor_count_max: randomMax,
                    modifier_all_impostors: modifiers.allImpostors,
                    modifier_all_impostors_prob: allImpostorsProb / 100,
                    modifier_all_different: modifiers.allDifferent,
                    modifier_all_different_prob: allDifferentProb / 100,
                    modifier_impostor_hints: modifiers.impostorHints,
                    local_player_count: mode === "local" ? localPlayerCount : undefined,
                    cards: cards.map((card) => ({
                      id: card.id,
                      name: card.name,
                      is_active: card.active,
                    })),
                    deleted_card_ids: deletedCardIds,
                  });
                } catch (err) {
                  console.error("Failed to save session config", err);
                  setError("No se pudo guardar la configuración.");
                } finally {
                  setSaving(false);
                  onClose();
                }
              }}
              className="flex-1 rounded-full bg-accent px-4 py-3 text-sm uppercase text-accent-foreground transition hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-border bg-surface px-4 py-3 text-sm uppercase text-text-primary transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
