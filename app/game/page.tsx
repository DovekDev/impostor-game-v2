"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { GAME_SESSION_ID, ADMIN_NICKNAME } from "@/lib/utils";
import { restoreLobbyPresence } from "@/actions/players";
import {
  startGame,
  advanceLocalTurn,
  castLocalVote,
  resolveLocalVotes,
  startNextLocalRound,
  startNewPartida,
  endGame,
} from "@/actions/game";
import { GameCard } from "@/components/game/GameCard";
import { VotingList } from "@/components/game/VotingList";
import { EliminationCard } from "@/components/game/EliminationCard";
import { GrungeFrame } from "@/components/game/GrungeFrame";
import { GameConfigPanel } from "@/components/home/GameConfigPanel";
import type { GameSession, LocalPlayerRole } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type LobbyPlayer = { id: string; nickname: string; is_host: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1 text-xs uppercase tracking-widest text-accent"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const router = useRouter();

  // identity
  const [nickname, setNickname] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // ui
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // lobby (online mode)
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);

  // session
  const [session, setSession] = useState<Partial<GameSession> | null>(null);

  // local mode in-turn state
  const [cardRevealed, setCardRevealed] = useState(false);
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<number | null>(null);
  const [localPlayerCountChoice, setLocalPlayerCountChoice] = useState(4);

  // ── Read identity from localStorage ──
  useEffect(() => {
    const stored = localStorage.getItem("nickname");
    const hostFlag = localStorage.getItem("is_host");
    if (!stored) {
      router.push("/");
      return;
    }
    setNickname(stored);
    setIsHost(hostFlag === "true" || stored === ADMIN_NICKNAME);
  }, [router]);

  // ── Initial data load ──
  const loadSession = useCallback(async () => {
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", GAME_SESSION_ID)
      .maybeSingle();
    if (data) setSession(data as Partial<GameSession>);
  }, []);

  const loadLobbyPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("id, nickname, is_host")
      .eq("is_in_lobby", true)
      .order("created_at", { ascending: true });
    setLobbyPlayers(data ?? []);
  }, []);

  useEffect(() => {
    if (session?.local_player_count) {
      setLocalPlayerCountChoice(session.local_player_count);
    }
  }, [session?.local_player_count]);

  useEffect(() => {
    if (!nickname) return;

    async function init() {
      await restoreLobbyPresence(nickname!);
      await Promise.all([loadSession(), loadLobbyPlayers()]);
      setLoading(false);
    }

    init();
  }, [nickname, loadSession, loadLobbyPlayers]);

  // ── Realtime ──
  useEffect(() => {
    // Session changes — drives all game state transitions
    const sessionChannel = supabase
      .channel("game-session-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
        },
        (payload) => {
          if ((payload.new as { id?: string })?.id === GAME_SESSION_ID) {
            setSession(payload.new as Partial<GameSession>);
            setCardRevealed(false);
            setSelectedVoteTarget(null);
            setError(null);
          }
        }
      )
      .subscribe((status) => {
        // Once subscribed, do a fresh fetch to catch any update we missed
        if (status === "SUBSCRIBED") {
          loadSession();
        }
      });

    // Lobby player list changes
    const lobbyChannel = supabase
      .channel("lobby-player-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        () => loadLobbyPlayers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(lobbyChannel);
    };
  }, [loadLobbyPlayers, loadSession]);

  // ── Derived values ──
  const state = session?.state ?? "lobby";
  const mode = session?.mode ?? "local";
  const localPlayerCount = session?.local_player_count ?? 4;
  const currentLocalTurn = session?.current_local_turn ?? 1;
  const modifierImpostorHints = session?.modifier_impostor_hints ?? false;

  const localRoles: LocalPlayerRole[] = ((session?.local_roles ?? []) as Array<any>).map((role) => ({
    turn: role?.turn ?? role?.playerNum ?? 1,
    role: role?.role ?? "innocent",
    card_id: role?.card_id ?? role?.cardId ?? "",
    card_name: role?.card_name ?? role?.cardName ?? "",
    card_hint: role?.card_hint ?? role?.cardHint ?? null,
    card_image_url: role?.card_image_url ?? role?.cardImageUrl ?? null,
    is_alive: role?.is_alive ?? role?.isAlive ?? true,
  }));

  const alivePlayers = localRoles.filter((r) => r.is_alive !== false);
  const eliminatedPlayerRole = ((number: number) => {
    return localRoles[number - 1].role;
  });
  const currentPlayerRole = localRoles.find(
    (r) => r.turn === currentLocalTurn
  ) ?? null;

  const voteCounts = Object.values(session?.local_votes ?? {}).reduce<Record<number, number>>((acc, target) => {
    const parsed = Number(target);
    if (!Number.isNaN(parsed)) {
      acc[parsed] = (acc[parsed] || 0) + 1;
    }
    return acc;
  }, {});

  const isLastDealingTurn = currentLocalTurn === localPlayerCount;
  const isLastVoter = (() => {
    const aliveNums = alivePlayers.map((p) => p.turn);
    return aliveNums.length > 0 && currentLocalTurn === aliveNums[aliveNums.length - 1];
  })();

  // ── Wrappers ──
  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "Algo salió mal");
      } else {
        // Always reload session after a successful action as a realtime fallback
        await loadSession();
      }
    } catch (e) {
      console.error(e);
      setError("Algo salió mal");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Redirect if not logged in ──
  if (!nickname) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // ── Non-host blocked message (local mode only) ──
  if (!loading && mode === "local" && !isHost && state === "lobby") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{ background: "#e8d5b0", border: "3px solid #3d2e1a" }}
        >
          <p
            className="text-2xl uppercase leading-tight"
            style={{ fontFamily: "var(--font-display)", color: "#1a1008" }}
          >
            No eres el anfitrión del juego para poder jugar en este modo.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL MODE GAME VIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  if (mode === "local") {
    // ── LOBBY ──
    if (state === "lobby") {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10 gap-6">
          <div className="w-full max-w-sm flex flex-col gap-4">
            {mode === "local" && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-text-secondary text-sm">Jugadores por partida</p>
                  <span className="text-accent text-sm uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-display)" }}>
                    {localPlayerCountChoice}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  value={localPlayerCountChoice}
                  onChange={(e) => setLocalPlayerCountChoice(Number(e.target.value))}
                  className="mt-3 w-full accent-accent"
                />
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-text-hint">
                  Se usará al iniciar la partida local.
                </p>
              </div>
            )}

            <button
              onClick={() =>
                run(() =>
                  startGame({
                    requestingNickname: nickname,
                    localPlayerCount: localPlayerCountChoice,
                  })
                )
              }
              disabled={actionLoading}
              className="w-full bg-accent text-accent-foreground rounded-full min-h-[48px] tracking-widest transition-colors hover:bg-accent-dark disabled:opacity-50 active:scale-95"
              style={{ fontFamily: "var(--font-display)", fontSize: "18px" }}
            >
              {actionLoading ? "INICIANDO..." : "EMPEZAR PARTIDA"}
            </button>

            <button
              onClick={() => setConfigOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-transparent border border-border text-text-primary rounded-full min-h-[48px] tracking-widest transition-colors hover:border-accent hover:text-accent active:scale-95"
              style={{ fontFamily: "var(--font-display)", fontSize: "14px" }}
            >
              <Settings size={16} />
              CONFIGURAR JUEGO
            </button>
          </div>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          {configOpen && (
            <GameConfigPanel onClose={() => setConfigOpen(false)} />
          )}
        </div>
      );
    }

    // ── DEALING (card reveal phase) ──
    if (state === "dealing") {
      // Show loading state if roles aren't loaded yet
      if (!currentPlayerRole) {
        return (
          <div className="min-h-[80vh] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        );
      }
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 gap-5">
          <GrungeFrame header={`${currentLocalTurn}/${localPlayerCount}`}>
            <div className="px-4 pb-5">
              <GameCard
                revealed={cardRevealed}
                player={currentPlayerRole}
                showImpostorHint={modifierImpostorHints}
                onClick={() => setCardRevealed(true)}
              />
            </div>
          </GrungeFrame>

          {/* CTA below frame */}
          {cardRevealed && (
            <button
              onClick={() =>
                run(() =>
                  advanceLocalTurn({ requestingNickname: nickname })
                )
              }
              disabled={actionLoading}
              className="w-full max-w-sm bg-accent text-accent-foreground rounded-full min-h-[48px] tracking-widest transition-colors hover:bg-accent-dark disabled:opacity-50 active:scale-95"
              style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}
            >
              {actionLoading
                ? "..."
                : isLastDealingTurn
                ? "COMENZAR RONDA DE PISTAS"
                : "PASAR AL SIGUIENTE JUGADOR"}
            </button>
          )}

          {/* Hint text */}
          <p
            className="text-text-hint text-center text-sm max-w-sm px-4"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {cardRevealed
              ? isLastDealingTurn
                ? "Pásale el celular al primer jugador para comenzar a votar..."
                : "Revela tu carta y pásale el celular al siguiente jugador..."
              : "Toca la carta para revelarla en secreto."}
          </p>
        </div>
      );
    }

    // ── HINTS (5 second wait, then voting) ──
    if (state === "hints") {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 gap-5">
          <GrungeFrame header="RONDA DE PISTAS">
            <div className="p-8 text-center flex flex-col gap-4">
              <p className="text-text-secondary text-sm">
                Cada jugador dice su pista en voz alta. Cuando todos hayan dicho su pista, el anfitrión inicia las votaciones.
              </p>
            </div>
          </GrungeFrame>

          {isHost && (
            <button
              onClick={() =>
                run(() =>
                  startNextLocalRound({
                    requestingNickname: nickname,
                    skipHints: true,
                  })
                )
              }
              disabled={actionLoading}
              className="w-full max-w-sm bg-accent text-accent-foreground rounded-full min-h-[48px] tracking-widest transition-colors hover:bg-accent-dark disabled:opacity-50 active:scale-95"
              style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}
            >
              {actionLoading ? "..." : "COMENZAR VOTACIONES"}
            </button>
          )}

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}
        </div>
      );
    }

    // ── VOTING ──
    if (state === "voting") {
      const aliveVoters = alivePlayers;
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 gap-5">
          <GrungeFrame header={`VOTA: JUGADOR ${currentLocalTurn}`}>
            <div className="px-4 pb-5">
              <VotingList
                alivePlayers={aliveVoters}
                currentVoterTurn={currentLocalTurn}
                selectedTarget={selectedVoteTarget}
                onSelect={setSelectedVoteTarget}
                isLastVoter={isLastVoter}
                voteCounts={voteCounts}
                onConfirm={async () => {
                  if (selectedVoteTarget === null) return;
                  await run(async () => {
                    const voteRes = await castLocalVote({
                      voterNum: currentLocalTurn,
                      targetNum: selectedVoteTarget,
                    });
                    if (!voteRes.success) return voteRes;
                    if (voteRes.isLastVoter) {
                      return resolveLocalVotes({
                        requestingNickname: nickname,
                      });
                    }
                    return voteRes;
                  });
                  setSelectedVoteTarget(null);
                }}
                loading={actionLoading}
              />
            </div>
          </GrungeFrame>

          {/* Hint text */}
          <p
            className="text-text-hint text-center text-sm max-w-sm px-4"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {isLastVoter
              ? "Vota a quien creas impostor y termina la votación así echar a alguien..."
              : "Vota a quien creas impostor y pásale el celular al siguiente jugador..."}
          </p>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}
        </div>
      );
    }

    // ── TIEBREAK ──
    if (state === "tiebreak") {

      const tiedCandidates = (session as any)?.local_tiebreak_candidates as number[] ?? [];
      const tiePlayers = alivePlayers.filter((p) => tiedCandidates.includes(p.turn));

      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 gap-5">
          <GrungeFrame header={`¡EMPATE! VOTA: JUGADOR ${currentLocalTurn}`}>
            <div className="px-4 pb-5">
              <VotingList
                alivePlayers={tiePlayers}
                currentVoterTurn={currentLocalTurn}
                selectedTarget={selectedVoteTarget}
                onSelect={setSelectedVoteTarget}
                isLastVoter={isLastVoter}
                voteCounts={voteCounts}
                onConfirm={async () => {
                  if (selectedVoteTarget === null) return;
                  await run(async () => {
                    const voteRes = await castLocalVote({
                      voterNum: currentLocalTurn,
                      targetNum: selectedVoteTarget,
                    });
                    if (!voteRes.success) return voteRes;
                    if (voteRes.isLastVoter) {
                      return resolveLocalVotes({
                        requestingNickname: nickname,
                        tiedNums: tiedCandidates,
                      });
                    }
                    return voteRes;
                  });
                  setSelectedVoteTarget(null);
                }}
                loading={actionLoading}
              />
            </div>
          </GrungeFrame>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}
        </div>
      );
    }

    // ── ROUND END / GAME OVER ──
    if (state === "round_end" || state === "game_over") {
      const eliminatedNum = (session as any)?.eliminated_this_round as number ?? null;
      const winner = session?.winner ?? null;
      const roleEliminated = eliminatedPlayerRole(eliminatedNum ?? 0);

      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 gap-5">
          <GrungeFrame header="ELIMINACION">
            <div className="px-4 pb-5">
              <EliminationCard
                eliminatedTurn={eliminatedNum ?? 0}
                hasImpostorsLeft={
                  alivePlayers.some((p) => p.role === "impostor")
                }
                roleEliminated={roleEliminated as "innocent" | "impostor" | null}
                winner={winner as "innocents" | "impostors" | null}
                loading={actionLoading}
                onContinueHints={() =>
                  run(() =>
                    startNextLocalRound({
                      requestingNickname: nickname,
                      skipHints: false,
                    })
                  )
                }
                onContinueVoting={() =>
                  run(() =>
                    startNextLocalRound({
                      requestingNickname: nickname,
                      skipHints: true,
                    })
                  )
                }
                onNewPartida={() =>
                  run(() => startNewPartida({ requestingNickname: nickname }))
                }
                onEndGame={() => run(() => endGame({}))}
              />
            </div>
          </GrungeFrame>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}
        </div>
      );
    }

    // Catch-all for local mode — unknown state or data still loading
    // Prevents falling through to the online lobby
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ONLINE MODE — LOBBY (v2.1, basic for now)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10 gap-4">
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className="text-accent text-xs uppercase tracking-widest"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sala de Espera
            </p>
            <h1
              className="text-text-primary text-2xl uppercase mt-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Modo Online
            </h1>
          </div>
          <Pill>Online</Pill>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 mb-6">
          {lobbyPlayers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl px-4 py-3 border border-border bg-surface-muted"
            >
              <div className="flex items-center gap-2">
                {p.is_host && <Crown size={14} className="text-host" />}
                <span
                  className="text-text-primary uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-display)", fontSize: "14px" }}
                >
                  {p.nickname}
                </span>
              </div>
              {p.is_host && (
                <span
                  className="text-xs text-host"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ANFITRIÓN
                </span>
              )}
            </div>
          ))}
          {lobbyPlayers.length === 0 && (
            <p className="text-text-muted text-sm text-center py-4">
              Esperando jugadores...
            </p>
          )}
        </div>

        {/* Host actions */}
        {isHost && (
          <div className="flex flex-col gap-3">
            <button
              disabled={lobbyPlayers.length < 3 || actionLoading}
              onClick={() =>
                run(() => startGame({ requestingNickname: nickname }))
              }
              className="w-full bg-accent text-accent-foreground rounded-full min-h-[48px] tracking-widest transition-colors hover:bg-accent-dark disabled:opacity-50 active:scale-95"
              style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}
            >
              {actionLoading ? "INICIANDO..." : "INICIAR JUEGO"}
            </button>
            {lobbyPlayers.length < 3 && (
              <p className="text-text-muted text-xs text-center">
                Se necesitan al menos 3 jugadores
              </p>
            )}
          </div>
        )}

        {!isHost && (
          <p className="text-text-muted text-sm text-center">
            Esperando a que el anfitrión inicie la partida...
          </p>
        )}

        {error && (
          <p className="text-danger text-sm text-center mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}
