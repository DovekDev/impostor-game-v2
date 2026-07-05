import { Banknote, Users, Zap } from "lucide-react";

const features = [
  {
    icon: Banknote,
    title: "100% Gratis",
    description: "Sin descargas ni registros.",
  },
  {
    icon: Users,
    title: "Juega con Amigos",
    description: "Crea salas privadas (prox. públicas).",
  },
  {
    icon: Zap,
    title: "Partidas Rápidas",
    description: "Diversión garantizada en minutos.",
  },
];

export function HomeFeatures() {
  return (
    <section className="bg-background py-8 border-t border-border">
      <div className="max-w-2xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-2 text-center">
              <f.icon size={20} className="text-accent" />
              <p
                className="text-text-primary text-xs uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {f.title}
              </p>
              <p className="text-text-muted text-xs leading-tight">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
