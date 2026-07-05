"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { GameConfigPanel } from "@/components/home/GameConfigPanel";
import { leaveLobby } from "@/actions/players";
import { ADMIN_NICKNAME } from "@/lib/utils";

// Dispatch this whenever localStorage nickname/is_host changes so all
// components subscribed to "nickname-changed" re-read their state.
function notifyNicknameChanged() {
  window.dispatchEvent(new Event("nickname-changed"));
}

export function NavbarWrapper() {
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  function syncFromStorage() {
    const stored = localStorage.getItem("nickname");
    const hostFlag = localStorage.getItem("is_host");
    setNickname(stored);
    setIsHost(hostFlag === "true" || stored === ADMIN_NICKNAME);
  }

  // Initial read + listen for changes from other components
  useEffect(() => {
    syncFromStorage();
    window.addEventListener("nickname-changed", syncFromStorage);
    return () => window.removeEventListener("nickname-changed", syncFromStorage);
  }, []);

  // Re-read on every route change (catches back/forward navigation)
  useEffect(() => {
    syncFromStorage();
  }, [pathname]);

  // Tab/window close — mark player as offline
  useEffect(() => {
    if (!nickname) return;
    const handleUnload = () => {
      fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
        keepalive: true,
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [nickname]);

  // "Cerrar sesión" — clears nick entirely, redirects to home
  const handleLogout = useCallback(async () => {
    if (!nickname) return;
    await leaveLobby(nickname);
    localStorage.removeItem("nickname");
    localStorage.removeItem("is_host");
    notifyNicknameChanged();
    window.location.href = "/";
  }, [nickname]);

  // "Salir de la sala" — keeps nick, just leaves the lobby, redirects to home
  const handleLeaveGame = useCallback(async () => {
    if (!nickname) return;
    await leaveLobby(nickname);
    window.location.href = "/";
  }, [nickname]);

  return (
    <>
      <Navbar
        nickname={nickname}
        isHost={isHost}
        onConfigOpen={() => setConfigOpen(true)}
        onLeaveGame={handleLeaveGame}
        onLogout={handleLogout}
        isGameRoute={pathname?.startsWith("/game")}
      />
      {configOpen && <GameConfigPanel onClose={() => setConfigOpen(false)} />}
    </>
  );
}
