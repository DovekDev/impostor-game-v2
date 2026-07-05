"use client";

import type { LocalPlayerRole } from "@/types";
import { cn } from "@/lib/utils";

type VotingListProps = {
  alivePlayers: LocalPlayerRole[];
  currentVoterTurn: number;
  selectedTarget: number | null;
  onSelect: (turn: number) => void;
  isLastVoter: boolean;
  voteCounts?: Record<number, number>;
  onConfirm: () => void;
  loading: boolean;
};

export function VotingList({
  alivePlayers,
  currentVoterTurn,
  selectedTarget,
  onSelect,
  isLastVoter,
  voteCounts,
  onConfirm,
  loading,
}: VotingListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-[1.2rem] overflow-hidden"
        style={{ border: "2px solid #8b6914", background: "#e8d5b0" }}
      >
        <div className="border-b border-[#8b6914] bg-[#d7bd89] px-4 py-3">
          <p
            className="uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "#5a3e20" }}
          >
            Elige a quien expulsar
          </p>
        </div>
        {alivePlayers.map((player, idx) => {
          const isSelf = player.turn === currentVoterTurn;
          const isSelected = player.turn === selectedTarget;

          return (
            <button
              key={player.turn}
              disabled={isSelf}
              onClick={() => !isSelf && onSelect(player.turn)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-4 text-left transition-colors",
                idx < alivePlayers.length - 1 ? "border-b border-[#8b6914]" : "",
                isSelf ? "cursor-not-allowed" : "cursor-pointer"
              )}
              style={{
                background: isSelf ? "#2d2d2d" : isSelected ? "#c4956a" : "#e8d5b0",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(14px, 4vw, 16px)",
                    color: isSelf ? "#8b8b8b" : isSelected ? "#1a0e05" : "#1a1008",
                    letterSpacing: "0.08em",
                  }}
                >
                  {isSelf ? "JUGADOR " + player.turn : `JUGADOR ${player.turn}`}
                </p>
                <p
                  className="mt-0.5"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    color: isSelf ? "#6d6d6d" : "#5a3e20",
                  }}
                >
                  {isSelected ? "Jugador seleccionado" : "Toca para votar"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "12px",
                    color: isSelf ? "#8b8b8b" : "#1a1008",
                  }}
                >
                  VOTOS
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: isSelf ? "#8b8b8b" : "#5a3e20",
                    fontWeight: 700,
                  }}
                >
                  {voteCounts?.[player.turn] ?? 0}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        disabled={!selectedTarget || loading}
        onClick={onConfirm}
        className="w-full rounded-full min-h-[48px] tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: selectedTarget ? "#f97316" : "#3d1c00",
          color: "#ffffff",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(13px, 3.5vw, 15px)",
          letterSpacing: "0.1em",
        }}
      >
        {loading
          ? "PROCESANDO..."
          : isLastVoter
          ? "CONFIRMAR VOTO Y TERMINAR VOTACIÓN"
          : "CONFIRMAR VOTO Y SIGUIENTE JUGADOR"}
      </button>
    </div>
  );
}
