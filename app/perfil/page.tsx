"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { ADMIN_NICKNAME } from "@/lib/utils";
import { createCard, updateCard, deleteCard, deletePlayer, forceLeavePlayer } from "@/actions/admin";
import { setHost } from "@/actions/players";
import { Crown, Shield, Plus, Pencil, Trash2, UserX, UserMinus } from "lucide-react";

type AdminCard = {
  id: string;
  name: string;
  hint: string | null;
  is_active: boolean;
};

type AdminPlayer = {
  id: string;
  nickname: string;
  is_host: boolean;
  is_admin: boolean;
  is_in_lobby: boolean;
  games_played: number;
  wins_innocent: number;
  wins_impostor: number;
  last_seen_at: string;
};

export default function AdminProfilePage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardHint, setCardHint] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nickname");
    setNickname(stored);
    setIsAdmin(stored === ADMIN_NICKNAME);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    void loadAdminData();
  }, [isAdmin]);

  async function loadAdminData() {
    setLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const [cardsResult, playersResult] = await Promise.all([
      supabase.from("cards").select("id, name, hint, is_active").order("created_at", { ascending: true }),
      supabase
        .from("players")
        .select("id, nickname, is_host, is_admin, is_in_lobby, games_played, wins_innocent, wins_impostor, last_seen_at")
        .order("created_at", { ascending: true }),
    ]);

    if (cardsResult.error || playersResult.error) {
      setErrorMessage("No se pudo cargar la información de administración.");
      setLoading(false);
      return;
    }

    setCards(cardsResult.data ?? []);
    setPlayers(playersResult.data ?? []);
    setLoading(false);
  }

  const resetCardForm = () => {
    setSelectedCardId(null);
    setCardName("");
    setCardHint("");
  };

  const handleEditCard = (card: AdminCard) => {
    setSelectedCardId(card.id);
    setCardName(card.name);
    setCardHint(card.hint ?? "");
    setActionMessage(null);
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    resetCardForm();
  };

  const handleSaveCard = async () => {
    if (!nickname) return;
    if (!cardName.trim()) {
      setErrorMessage("El nombre de la carta es obligatorio.");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const payload = {
      requestingNickname: nickname,
      name: cardName.trim(),
      hint: cardHint.trim() || undefined,
    };

    const result = selectedCardId
      ? await updateCard({ ...payload, cardId: selectedCardId })
      : await createCard(payload);

    if (!result.success) {
      setErrorMessage(result.error ?? "No se pudo guardar la carta.");
    } else {
      setActionMessage(selectedCardId ? "Carta actualizada." : "Carta creada.");
      resetCardForm();
      await loadAdminData();
    }

    setActionLoading(false);
  };

  const handleDeleteCard = async (card: AdminCard) => {
    if (!nickname) return;
    const confirmed = window.confirm(`Eliminar la carta "${card.name}"? Esta acción desactivará la carta.`);
    if (!confirmed) return;

    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const result = await deleteCard({ requestingNickname: nickname, cardId: card.id });
    if (!result.success) {
      setErrorMessage(result.error ?? "No se pudo eliminar la carta.");
    } else {
      setActionMessage("Carta eliminada.");
      if (selectedCardId === card.id) {
        resetCardForm();
      }
      await loadAdminData();
    }

    setActionLoading(false);
  };

  const handleDeletePlayer = async (player: AdminPlayer) => {
    if (!nickname) return;
    const confirmed = window.confirm(`Eliminar al jugador "${player.nickname}" de la base de datos? Esta acción es irreversible.`);
    if (!confirmed) return;

    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const result = await deletePlayer({ requestingNickname: nickname, targetNickname: player.nickname });
    if (!result.success) {
      setErrorMessage(result.error ?? "No se pudo eliminar el jugador.");
    } else {
      setActionMessage("Jugador eliminado.");
      await loadAdminData();
    }

    setActionLoading(false);
  };

  const handleForceLeave = async (player: AdminPlayer) => {
    if (!nickname) return;
    const confirmed = window.confirm(`Forzar salida de "${player.nickname}" de la sala?`);
    if (!confirmed) return;

    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const result = await forceLeavePlayer({ requestingNickname: nickname, targetNickname: player.nickname });
    if (!result.success) {
      setErrorMessage(result.error ?? "No se pudo expulsar al jugador.");
    } else {
      setActionMessage("Jugador expulsado de la sala.");
      await loadAdminData();
    }

    setActionLoading(false);
  };

  const handleAssignHost = async (player: AdminPlayer) => {
    if (!nickname) return;
    const confirmed = window.confirm(`Asignar a "${player.nickname}" como nuevo anfitrión?`);
    if (!confirmed) return;

    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    const result = await setHost(player.nickname, nickname);
    if (!result.success) {
      setErrorMessage(result.error ?? "No se pudo asignar el anfitrión.");
    } else {
      setActionMessage("Nuevo anfitrión asignado.");
      await loadAdminData();
    }

    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <p className="text-text-secondary">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (!nickname || !isAdmin) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-accent" />
          <h1 className="text-text-primary mb-2 text-2xl font-display uppercase tracking-[0.2em]">Acceso denegado</h1>
          <p className="text-text-secondary mb-6">Debes iniciar sesión como administrador para acceder a este panel.</p>
          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-dark">
            Volver a Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-accent text-xs uppercase tracking-[0.3em]">Administración</p>
              <h1 className="text-text-primary mt-3 text-4xl font-display uppercase tracking-wide">Panel Admin</h1>
              <p className="mt-2 text-text-secondary max-w-2xl">Desde aquí puedes administrar cartas y jugadores. Estas acciones se aplican inmediatamente a la sesión en curso.</p>
            </div>
            <div className="rounded-3xl bg-surface-secondary border border-border p-4 text-sm text-text-secondary">
              <p className="font-display uppercase tracking-[0.2em] text-xs text-text-primary">Administrador conectado</p>
              <p className="mt-2 font-semibold">{nickname}</p>
            </div>
          </div>
        </header>

        {(actionMessage || errorMessage) && (
          <div className={
            `rounded-3xl border p-4 text-sm ${errorMessage ? "border-danger bg-danger-muted text-danger" : "border-accent bg-accent-muted text-accent"}`
          }>
            {errorMessage ?? actionMessage}
          </div>
        )}

        <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-border bg-surface p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-[0.3em]">Cartas</p>
                <h2 className="mt-2 text-2xl font-display uppercase tracking-wide">Administrar cartas</h2>
              </div>
              <div className="rounded-full bg-accent-muted px-3 py-1 text-xs uppercase tracking-[0.24em] text-accent">
                {cards.filter((card) => card.is_active).length} activas
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-text-secondary text-xs uppercase tracking-[0.2em]">Nombre</span>
                  <input
                    value={cardName}
                    onChange={(event) => setCardName(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-accent"
                    placeholder="Ej. Messi"
                  />
                </label>
                <label className="block">
                  <span className="text-text-secondary text-xs uppercase tracking-[0.2em]">Pista (opcional)</span>
                  <input
                    value={cardHint}
                    onChange={(event) => setCardHint(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-accent"
                    placeholder="Ej. Fútbol"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveCard}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-dark disabled:opacity-50"
                >
                  <Plus size={16} />
                  {selectedCardId ? "Guardar cambios" : "Crear carta"}
                </button>
                {selectedCardId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm text-text-secondary transition hover:border-text-primary hover:text-text-primary"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {cards.length === 0 ? (
                <div className="rounded-3xl border border-border p-6 text-center text-text-secondary">No hay cartas registradas.</div>
              ) : (
                cards.map((card) => (
                  <div key={card.id} className="rounded-3xl border border-border p-4 bg-surface-secondary">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-display text-lg uppercase tracking-wide text-text-primary">{card.name}</p>
                        <p className="text-text-secondary text-sm">{card.hint ?? "Sin pista"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCard(card)}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
                        >
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card)}
                          className="inline-flex items-center gap-2 rounded-full border border-danger bg-danger-muted px-4 py-2 text-sm text-danger transition hover:bg-danger/90"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-surface p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-[0.3em]">Jugadores</p>
                <h2 className="mt-2 text-2xl font-display uppercase tracking-wide">Administrar jugadores</h2>
              </div>
              <div className="rounded-full bg-surface-secondary px-3 py-1 text-xs uppercase tracking-[0.24em] text-text-secondary">
                {players.length} registrados
              </div>
            </div>

            <div className="space-y-4">
              {players.length === 0 ? (
                <div className="rounded-3xl border border-border p-6 text-center text-text-secondary">No hay jugadores registrados.</div>
              ) : (
                players.map((player) => (
                  <div key={player.id} className="rounded-3xl border border-border p-4 bg-surface-secondary">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-lg uppercase tracking-wide text-text-primary">{player.nickname}</p>
                          {player.is_admin && (
                            <span className="rounded-full bg-accent-muted px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-accent">Admin</span>
                          )}
                          {player.is_host && (
                            <span className="rounded-full bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-text-secondary">Anfitrión</span>
                          )}
                          {player.is_in_lobby ? (
                            <span className="rounded-full bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-text-secondary">En sala</span>
                          ) : (
                            <span className="rounded-full bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-text-secondary">Fuera</span>
                          )}
                        </div>
                        <p className="text-text-secondary text-sm">
                          Partidas: {player.games_played} · Victorias inocentes: {player.wins_innocent} · Victorias impostor: {player.wins_impostor}
                        </p>
                        <p className="text-text-secondary text-xs">Última conexión: {new Date(player.last_seen_at).toLocaleString("es-ES")}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!player.is_host && !player.is_admin && (
                          <button
                            type="button"
                            onClick={() => handleAssignHost(player)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
                          >
                            <Crown size={14} /> Asignar anfitrión
                          </button>
                        )}
                        {!player.is_admin && (
                          <button
                            type="button"
                            onClick={() => handleForceLeave(player)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-text-secondary transition hover:border-danger hover:text-danger"
                          >
                            <UserMinus size={14} /> Forzar salida
                          </button>
                        )}
                        {!player.is_admin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 rounded-full border border-danger bg-danger-muted px-4 py-2 text-sm text-danger transition hover:bg-danger/90"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
