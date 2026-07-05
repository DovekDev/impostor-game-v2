import Image from "next/image";

type EliminationCardProps = {
  eliminatedTurn: number;
  hasImpostorsLeft: boolean;
  roleEliminated: "innocent" | "impostor" | null;
  winner: "innocents" | "impostors" | null;
  onContinueHints: () => void;
  onContinueVoting: () => void;
  onNewPartida: () => void;
  onEndGame: () => void;
  loading: boolean;
};

export function EliminationCard({
  eliminatedTurn,
  hasImpostorsLeft,
  roleEliminated,
  winner,
  onContinueHints,
  onContinueVoting,
  onNewPartida,
  onEndGame,
  loading,
}: EliminationCardProps) {
  const isGameOver = !!winner;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="w-full rounded-[1.4rem] overflow-hidden flex flex-col items-center justify-center py-8 px-6 gap-4"
        style={{
          background: "#e8d5b0",
          border: "2px solid #8b6914",
          minHeight: "60vw",
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
          style={{ background: "#ffffff", padding: "4px" }}
        >
          <Image
            src="/img/mono_logo.webp"
            alt="Mono"
            width={72}
            height={72}
            className="rounded-full object-cover"
          />
        </div>

        <p
          className="text-center leading-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 7vw, 32px)",
            color: "#e53e3e",
            letterSpacing: "0.06em",
          }}
        >

          {isGameOver
            ? winner === "innocents"
              ? "IMPOSTOR\nATRAPADO"
              : "INOCENTE\nELIMINADO"
            : roleEliminated === "innocent"
            ? `JUGADOR ${eliminatedTurn}\nERA INOCENTE`
            : `JUGADOR ${eliminatedTurn}\nERA IMPOSTOR`}
        </p>

        <div className="w-16 h-0.5" style={{ background: "#e53e3e" }} />

        <p
          className="text-center"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            color: "#5a3e20",
          }}
        >
          {isGameOver
            ? winner === "innocents"
              ? "Los inocentes han conseguido la victoria."
              : "Los impostores han conseguido la victoria."
            : hasImpostorsLeft
            ? "Aún quedan impostores en la partida."
            : "No quedan impostores y los inocentes han ganado."}
        </p>
      </div>

      {isGameOver ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={onNewPartida}
            disabled={loading}
            className="w-full rounded-full min-h-[48px] tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: "#f97316",
              color: "#ffffff",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              letterSpacing: "0.1em",
            }}
          >
            COMENZAR NUEVA PARTIDA
          </button>
          <button
            onClick={onEndGame}
            disabled={loading}
            className="w-full rounded-full min-h-[48px] tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: "transparent",
              border: "1px solid #3d2e1a",
              color: "#aaaaaa",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              letterSpacing: "0.1em",
            }}
          >
            TERMINAR JUEGO
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinueHints}
            disabled={loading}
            className="w-full rounded-full min-h-[48px] tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: "#f97316",
              color: "#ffffff",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              letterSpacing: "0.1em",
            }}
          >
            SEGUIR CON OTRA RONDA DE PISTAS
          </button>
          <button
            onClick={onContinueVoting}
            disabled={loading}
            className="w-full rounded-full min-h-[48px] tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: "#f97316",
              color: "#ffffff",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              letterSpacing: "0.1em",
            }}
          >
            CONTINUAR CON VOTACIONES
          </button>
        </div>
      )}
    </div>
  );
}
