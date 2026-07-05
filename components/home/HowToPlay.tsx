import Image from "next/image";
import { MessageSquare, Eye, Vote, Trophy } from "lucide-react";

const steps = [
  {
    icon: Eye,
    title: "Recibe tu carta",
    description:
      "Todos reciben la misma palabra secreta, excepto el Impostor. Él no sabe nada, pero debe fingir que sí.",
  },
  {
    icon: MessageSquare,
    title: "Da una pista",
    description:
      "Por turnos, cada jugador dice una pista relacionada con la palabra. El Impostor debe inventar una convincente.",
  },
  {
    icon: Vote,
    title: "Vota y elimina",
    description:
      "Al final de cada ronda, todos votan para eliminar al sospechoso. ¿Acertarán?",
  },
  {
    icon: Trophy,
    title: "Descubre quién miente",
    description:
      "Los inocentes ganan eliminando a todos los impostores. Los impostores ganan si llegan a ser mayoría.",
  },
];

export function HowToPlay() {
  return (
    <section className="bg-background py-14">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:gap-12 md:items-start">
          {/* Left: steps */}
          <div className="flex-1 flex flex-col gap-6 relative z-10 mb-[-2.5rem] md:mb-0">
            <div className="flex flex-col gap-1">
              <h2
                className="text-text-primary uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 7vw, 40px)",
                  lineHeight: 1.1,
                }}
              >
                Cómo se juega a
              </h2>
              <h2
                className="text-accent uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 7vw, 40px)",
                  lineHeight: 1.1,
                }}
              >
                El Impostor
              </h2>
            </div>

            <p className="text-text-secondary text-sm leading-relaxed">
              Una mecánica de roles ocultos fácil de aprender. Descubre quién
              miente en partidas rápidas de deducción.
            </p>

            <div className="flex flex-col gap-5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-muted border border-accent flex items-center justify-center shrink-0 mt-0.5">
                    <step.icon size={18} className="text-accent" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3
                      className="text-accent text-sm tracking-widest uppercase"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: card image — full width on mobile, fixed on desktop */}
          <div className="relative pt-3 w-[80%] h-[34rem] sm:h-[40rem] md:w-[26rem] md:h-[40rem] shrink-0 mx-auto mt-10 md:mt-12">
            <Image
              src="/img/carta_volteada.webp"
              alt="Carta del juego"
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
