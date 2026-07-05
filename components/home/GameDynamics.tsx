import Image from "next/image";

export function GameDynamics() {
  return (
    <section className="bg-surface-secondary py-14">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex h-[500px] flex-col-reverse md:flex-row md:items-center md:gap-10">
          {/* Text */}
          <div className="flex-1 bottom-[20px] flex flex-col gap-4 relative z-10 mb-[-2.5rem] md:mb-0">
            <span
              className="text-accent text-xs tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              La dinámica del juego
            </span>

            <div className="flex flex-col leading-none">
              <h2
                className="text-text-primary uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px, 9vw, 56px)",
                  lineHeight: 1,
                }}
              >
                Miente con
              </h2>
              <h2
                className="text-text-primary uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px, 9vw, 56px)",
                  lineHeight: 1,
                }}
              >
                Astucia.
              </h2>
              <h2
                className="text-accent uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px, 9vw, 56px)",
                  lineHeight: 1,
                }}
              >
                Sospecha de Todos
              </h2>
            </div>

            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              Todos reciben una palabra secreta menos el Impostor. Es un juego
              de deducción social: actúa natural, debate con astucia y sobrevive
              a las votaciones.
            </p>
          </div>

          {/* Monkey impostor image — full width on mobile, fixed on desktop */}
          <div className="relative top-[60px] w-full h-[32rem] sm:h-[38rem] md:w-[30rem] md:h-[38rem] shrink-0 mx-auto mt-8 md:mt-0">
            <Image
              src="/img/mono_impostor.webp"
              alt="Mono impostor"
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
