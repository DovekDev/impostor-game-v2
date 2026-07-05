"use client";

import Image from "next/image";
import type { LocalPlayerRole } from "@/types";

type GameCardProps = {
  revealed: boolean;
  player: LocalPlayerRole;
  showImpostorHint: boolean;
  onClick?: () => void;
};

// The game card shown during the dealing phase.
// Face-down: carta_volteada.webp with "CLICK PARA REVELAR CARTA" overlay.
// Revealed innocent: kraft texture + card image + card name.
// Revealed impostor: dark bg + mono_impostor.webp + red ERES IMPOSTOR text.
export function GameCard({ revealed, player, showImpostorHint, onClick }: GameCardProps) {
  if (!revealed) {
    return (
      <button
        onClick={onClick}
        className="w-full aspect-[3/4] relative overflow-hidden rounded-[1.4rem] border-[2px] border-[#3d2e1a] bg-[#0f0f0f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] active:scale-[0.98] transition-transform"
        aria-label="Revelar carta"
      >
        <Image
          src="/img/carta_volteada.webp"
          alt="Carta por revelar"
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <p
            className="px-4 text-center drop-shadow-lg"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(18px, 5vw, 24px)",
              letterSpacing: "0.12em",
              color: "#f7e5bd",
            }}
          >
            CLICK PARA REVELAR CARTA
          </p>
        </div>
      </button>
    );
  }

  if (player.role === "impostor") {
    return (
      <div
        className="w-full aspect-[3/4] relative rounded-[1.4rem] overflow-hidden flex flex-col items-center justify-center gap-3 p-4"
        style={{
          background: "#1a0a0a",
          border: "2px solid #5a1212",
          boxShadow: "0 0 32px rgba(229,62,62,0.25)",
        }}
      >
        <Image
          src="/img/carta_vacia_vertical.webp"
          alt="Carta revelada"
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
          priority
        />
        <div className="relative h-[100%] w-[100%] justify-items-center content-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative w-3/5 aspect-square">
            <Image
              src="/img/mono_impostor.webp"
              alt="Impostor"
              fill
              sizes="200px"
              className="object-contain"
            />
          </div>
          <p
            className="text-center leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 8vw, 36px)",
              color: "#e53e3e",
              textShadow: "0 0 20px rgba(229,62,62,0.45)",
              letterSpacing: "0.05em",
            }}
          >
            ¡ERES IMPOSTOR!
          </p>
          {showImpostorHint && player.card_hint && (
            <p
              className="text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(16px, 4vw, 20px)",
                color: "#f97316",
                letterSpacing: "0.08em",
                paddingTop: "10px",
              }}
            >
              PISTA: {player.card_hint.toUpperCase()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-[3/4] relative overflow-hidden rounded-[1.4rem] border-[2px] border-[#3d2e1a] bg-[#0f0f0f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] active:scale-[0.98] transition-transform"
    >
      <Image
        src="/img/carta_vacia_vertical.webp"
        alt="Carta revelada"
        fill
        sizes="(max-width: 640px) 100vw, 400px"
        className="object-cover"
        priority
      />
      <div className="relative h-[100%] w-[100%]">
        <div className="flex-1 absolute top-[15%] h-[50%] w-[100%] min-h-0">
          {player.card_image_url ? (
            <Image
              src={player.card_image_url}
              alt={player.card_name}
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image
                src="/img/carta_vacia_vertical.webp"
                alt="Carta vacía"
                fill
                sizes="200px"
                className="object-contain p-4"
              />
            </div>
          )}
        </div>

        <div
          className="flex absolute w-[100%] bottom-[-115px] items-center justify-center p-3"
          style={{
            minHeight: "30%",
            top: "30%",
          }}
        >
          <p
            className="text-center leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 7vw, 32px)",
              color: "#1a1008",
              letterSpacing: "0.05em",
            }}
          >
            {player.card_name.toUpperCase()}
          </p>
        </div>
      </div>
      
    </div>
  );
}
