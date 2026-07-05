"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { joinLobby } from "@/actions/players";

export function NicknameInput() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const result = await joinLobby(trimmed);

    if (!result.success) {
      setError(result.error ?? "Error al unirse");
      setLoading(false);
      return;
    }

    localStorage.setItem("nickname", trimmed);
    if (result.isHost) localStorage.setItem("is_host", "true");

    router.push("/game");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setError(null);
          }}
          placeholder="ESCRIBE TU NICK"
          maxLength={20}
          className="flex-1 bg-surface-secondary border border-border rounded-full px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:border-accent min-h-[48px] tracking-wide"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            // focus ring color via inline since Tailwind v4 needs CSS var
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0 transition-colors hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Entrar"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ArrowRight size={18} />
          )}
        </button>
      </div>

      {error && (
        <p className="text-danger text-xs px-2" style={{ fontFamily: "var(--font-sans)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
