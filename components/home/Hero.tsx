"use client";

import Image from "next/image";
import Link from "next/link";
import { NicknameInput } from "@/components/home/NicknameInput";

type HeroProps = {
  nickname: string | null;
  isHost: boolean;
  onConfigClick: () => void;
};

export function Hero({ nickname, isHost, onConfigClick }: HeroProps) {
  return (
    <section className="relative bg-background">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(249,115,22,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-0 md:pb-12">
        {/* Mobile: stack column — text on top, image below */}
        {/* Desktop: side by side */}
        <div className="flex sm:h-[650px] flex-col-reverse md:flex-row md:items-center md:gap-8">

          {/* Text side */}
          <div className="flex-1 bottom-[300px] self-center flex flex-col gap-5 pb-6 md:pb-0 relative z-10 mb-[-2.5rem] md:mb-0">
            {/* Small label */}
            <span
              className="text-accent text-xs tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Juega Ahora
            </span>

            {/* Main heading */}
            <div className="flex flex-col leading-none">
              <h1
                className="text-text-primary uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(52px, 14vw, 80px)",
                  lineHeight: 0.95,
                }}
              >
                Descubre
              </h1>
              <h1
                className="text-accent uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(52px, 14vw, 80px)",
                  lineHeight: 0.95,
                }}
              >
                Quién Miente
              </h1>
            </div>

            {/* Description */}
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              Juega al Impostor online gratis con amigos — juego de palabras y
              deducción. Inicia una partida privada con tus amigos o únete a una
              de nuestras salas públicas para jugar en cualquier momento.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-xs">
              {!nickname ? (
                <NicknameInput />
              ) : (
                <>
                  <Link
                    href="/game"
                    className="w-full bg-accent text-accent-foreground rounded-full min-h-[48px] flex items-center justify-center tracking-widest transition-colors hover:bg-accent-dark active:scale-95"
                    style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}
                  >
                    ENTRAR A LA SALA
                  </Link>

                  {isHost && (
                    <button
                      onClick={onConfigClick}
                      className="w-full bg-surface border border-border text-text-primary rounded-full min-h-[48px] flex items-center justify-center gap-2 tracking-widest transition-colors hover:border-accent hover:text-accent active:scale-95"
                      style={{ fontFamily: "var(--font-display)", fontSize: "14px" }}
                    >
                      CONFIGURAR JUEGO ⚙
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Monkey image — full width on mobile, fixed size on desktop */}
          <div className="relative top[180px] w-full h-[34rem] sm:h-[40rem] md:w-[34rem] md:h-[42rem] shrink-0 mt-6 md:mt-0">
            <Image
              src="/img/mono_con_carta.webp"
              alt="Mono con carta"
              fill
              sizes="(max-width: 768px) 100vw, 576px"
              className="object-contain object-center drop-shadow-2xl"
              priority
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
