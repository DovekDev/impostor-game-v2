export function Footer() {
  return (
    <footer className="bg-surface border-t border-border py-5">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-1">
        <p
          className="text-text-muted text-xs tracking-wide uppercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ©2026 El Impostor. Todos los derechos reservados.
        </p>
        <p className="text-text-muted text-xs">
          Hecho con ♥ para amigos
        </p>
      </div>
    </footer>
  );
}
