"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NICKNAME } from "@/lib/utils";

type NavbarProps = {
  nickname?: string | null;
  isHost?: boolean;
  onConfigOpen?: () => void;
  onLeaveGame?: () => void;
  onLogout?: () => void;
  isGameRoute?: boolean;
};

export function Navbar({
  nickname,
  isHost,
  onConfigOpen,
  onLeaveGame,
  onLogout,
  isGameRoute,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = nickname === ADMIN_NICKNAME;

  const navLinks = [
    { href: "/", label: "Inicio", requiresAuth: false },
    { href: "/game", label: "Jugar", requiresAuth: true },
    { href: "/perfil", label: "Perfil", requiresAuth: true },
  ].filter((link) => !link.requiresAuth || !!nickname);

  const handleNavLinkClick = (href: string) => async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isGameRoute && href !== "/game") {
      const confirmed = window.confirm("Seguro que quieres salir del juego?");
      if (!confirmed) {
        event.preventDefault();
        return;
      }
      await onLeaveGame?.();
    }
    setMenuOpen(false);
  };

  const handleLogoClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isGameRoute) {
      const confirmed = window.confirm("Seguro que quieres salir del juego?");
      if (!confirmed) {
        event.preventDefault();
        return;
      }
      await onLeaveGame?.();
    }
  };

  const handleGameAction = async () => {
    setMenuOpen(false);
    if (isGameRoute) {
      await onLeaveGame?.();
    } else {
      await onLogout?.();
    }
  };

  return (
    <nav className="w-full bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.webp"
            alt="¿Gay o Falso Nueve?"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span
            className="font-display text-lg text-text-primary tracking-wide leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Gay o Falso Nueve?
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNavLinkClick(link.href)}
              className={cn(
                "font-display text-sm tracking-wide transition-colors",
                pathname === link.href
                  ? "text-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {nickname ? (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-3 py-1.5 min-h-[36px] transition-colors hover:bg-accent-dark"
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
            <span
              className="font-display text-xs tracking-wider hidden sm:block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {nickname}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-text-secondary hover:text-text-primary p-2 min-h-[44px] min-w-[44px] flex items-center justify-center md:hidden"
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="bg-surface border-t border-border px-4 py-3 flex flex-col gap-1 max-w-2xl mx-auto">
          <div className="flex flex-col gap-1 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleNavLinkClick(link.href)}
                className={cn(
                  "font-display text-base text-center tracking-wide py-2 px-3 rounded-lg transition-colors",
                  pathname === link.href
                    ? "text-accent bg-accent-muted"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border my-1" />
          </div>

          {isHost && onConfigOpen && (
            <button
              className="flex items-center gap-2 text-left font-display text-sm tracking-wide text-text-secondary hover:text-accent py-2 px-3 rounded-lg hover:bg-accent-muted transition-colors w-full"
              style={{ fontFamily: "var(--font-display)" }}
              onClick={() => {
                setMenuOpen(false);
                onConfigOpen();
              }}
            >
              <Settings size={16} className="text-accent" />
              Configurar Juego
            </button>
          )}

          {isAdmin && (
            <Link
              href="/perfil"
              onClick={handleNavLinkClick("/perfil")}
              className="flex items-center gap-2 font-display text-sm tracking-wide text-text-secondary hover:text-accent py-2 px-3 rounded-lg hover:bg-accent-muted transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Shield size={16} className="text-accent" />
              Panel Admin
            </Link>
          )}

          {nickname && (
            <button
              className="flex items-center gap-2 text-left font-display text-sm tracking-wide text-text-muted hover:text-danger py-2 px-3 rounded-lg hover:bg-danger-muted transition-colors w-full mt-1"
              style={{ fontFamily: "var(--font-display)" }}
              onClick={handleGameAction}
            >
              {isGameRoute ? "Salir de la sala" : "Cerrar sesión"}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
