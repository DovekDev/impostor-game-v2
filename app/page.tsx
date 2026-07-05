"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/components/home/Hero";
import { GameDynamics } from "@/components/home/GameDynamics";
import { HowToPlay } from "@/components/home/HowToPlay";
import { BottomCTA } from "@/components/home/BottomCTA";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { Footer } from "@/components/home/Footer";
import { GameConfigPanel } from "@/components/home/GameConfigPanel";
import { ADMIN_NICKNAME } from "@/lib/utils";

export default function HomePage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    function syncFromStorage() {
      const stored = localStorage.getItem("nickname");
      const hostFlag = localStorage.getItem("is_host");
      setNickname(stored);
      setIsHost(hostFlag === "true" || stored === ADMIN_NICKNAME);
    }

    // Initial read
    syncFromStorage();

    // Re-read whenever another part of the app changes localStorage
    // (e.g. NavbarWrapper calls logout → dispatches this event)
    window.addEventListener("nickname-changed", syncFromStorage);
    return () => window.removeEventListener("nickname-changed", syncFromStorage);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Hero
        nickname={nickname}
        isHost={isHost}
        onConfigClick={() => setConfigOpen(true)}
      />
      <GameDynamics />
      <HowToPlay />
      <BottomCTA nickname={nickname} />
      <HomeFeatures />
      <Footer />

      {/* Config panel — placeholder until Feature 07/08 */}
      {configOpen && <GameConfigPanel onClose={() => setConfigOpen(false)} />}
    </div>
  );
}
