"use client";

import Image from "next/image";
import Link from "next/link";
import { NicknameInput } from "@/components/home/NicknameInput";

type BottomCTAProps = {
  nickname: string | null;
};

export function BottomCTA({ nickname }: BottomCTAProps) {
  return (
    <section className="bg-surface-secondary py-14">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col-reverse md:flex-row md:items-center md:gap-10">
          {/* CTA text + action — always on top on mobile */}
          <div className="flex-1 flex flex-col gap-5 items-center md:items-start text-center md:text-left relative z-10 mb-[-2.5rem] md:mb-0">
            <div className="flex flex-col leading-none">
              <h2
                className="text-text-primary uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 7vw, 44px)",
                  lineHeight: 1,
                }}
              >
                ¿Listo para descubrir
              </h2>
              <h2
                className="text-accent uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 7vw, 44px)",
                  lineHeight: 1,
                }}
              >
                Quién Miente?
              </h2>
            </div>

            <div className="w-full max-w-xs">
              {!nickname ? (
                <NicknameInput />
              ) : (
                <Link
                  href="/game"
                  className="w-full bg-accent text-accent-foreground rounded-full min-h-[48px] flex items-center justify-center tracking-widest transition-colors hover:bg-accent-dark active:scale-95"
                  style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}
                >
                  ENTRAR A LA SALA
                </Link>
              )}
            </div>
          </div>

          {/* Monkey with card — below text on mobile, left column on desktop */}
          <div className="relative w-full h-[30rem] sm:h-[36rem] md:w-[26rem] md:h-[36rem] shrink-0 mx-auto mt-6 md:mt-0 md:order-first">
            <Image
              src="/img/mono_con_carta.webp"
              alt="Mono listo para jugar"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
