"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { toPng } from "html-to-image";
import {
  Bot,
  CalendarDays,
  Download,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Plus,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { ExportStory } from "@/components/export-story";
import { PitchBoard } from "@/components/pitch-board";
import { PlayerCard } from "@/components/player-card";
import { ImageCropper } from "@/components/image-cropper";
import {
  DEFAULT_FORMATION_KEY,
  FORMATION_TEMPLATES,
  createLineupSlots,
  remapMatchFormation,
} from "@/lib/formations";
import {
  loadAiAnalysisSettings,
  loadAppState,
  saveAiAnalysisSettings,
  saveAppState,
} from "@/lib/storage";
import {
  getSupabaseSessionUser,
  loadRemoteTeamState,
  persistRemoteTeamState,
  signInLeader,
  signOutLeader,
  subscribeToSupabaseAuth,
  uploadPlayerImage,
} from "@/lib/supabase-data";
import { supabaseConfigured } from "@/lib/supabase";
import {
  AiAnalysisSettings,
  MatchRecord,
  Player,
  PlayerTrait,
  TeamAppState,
} from "@/lib/types";

type PlayerFormState = {
  id?: string;
  firstName: string;
  lastName: string;
  number: string;
  image?: string;
};

type MatchFormState = {
  matchDate: string;
  opponentName: string;
  location: string;
  formationKey: string;
};

type StudioTab = "players" | "matches" | "lineup" | "export" | "analysis";

const PLAYER_TRAIT_OPTIONS: PlayerTrait[] = [
  "Peppande",
  "Utstrålar glädje",
  "Ledare",
  "Lugn under press",
  "Kommunikativ",
  "Vinnarskalle",
];

const emptyPlayerForm: PlayerFormState = {
  firstName: "",
  lastName: "",
  number: "",
  image: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : undefined;
    const maybeDetails = "details" in error ? error.details : undefined;
    const maybeHint = "hint" in error ? error.hint : undefined;

    const parts = [maybeMessage, maybeDetails, maybeHint].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return fallback;
}

function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function removePlayerEverywhere(match: MatchRecord, playerId: string): MatchRecord {
  return {
    ...match,
    lineupSlots: match.lineupSlots.map((slot) =>
      slot.playerId === playerId ? { ...slot, playerId: null } : slot,
    ),
    benchPlayerIds: match.benchPlayerIds.filter((id) => id !== playerId),
    unavailablePlayerIds: match.unavailablePlayerIds.filter((id) => id !== playerId),
    goalScorers: match.goalScorers?.filter((entry) => entry.playerId !== playerId),
  };
}

function createMatchState(form: MatchFormState, teamId: string): MatchRecord {
  return {
    id: crypto.randomUUID(),
    teamId,
    matchDate: form.matchDate,
    matchType: "league",
    opponentName: form.opponentName,
    location: form.location,
    formationKey: form.formationKey,
    status: "draft",
    lineupSlots: createLineupSlots(form.formationKey),
    benchPlayerIds: [],
    unavailablePlayerIds: [],
    createdAt: new Date().toISOString(),
  };
}

function sortPlayersByGoals(
  entries: { player: Player; goals: number; matches: number }[],
) {
  return [...entries].sort((a, b) => {
    if (b.goals !== a.goals) {
      return b.goals - a.goals;
    }

    if (b.matches !== a.matches) {
      return b.matches - a.matches;
    }

    return a.player.lastName.localeCompare(b.player.lastName, "sv");
  });
}

function buildAiAnalysisPrompt(matches: MatchRecord[], players: Map<string, Player>, question: string) {
  const matchSummary = matches
    .map((match) => {
      const starters = match.lineupSlots.map((slot) => {
        const player = slot.playerId ? players.get(slot.playerId) : undefined;
        return {
          position: slot.positionLabel,
          player: player ? `${player.firstName} ${player.lastName}` : "Ingen spelare vald",
          number: player?.number ?? null,
        };
      });

      const bench = match.benchPlayerIds
        .map((playerId) => players.get(playerId))
        .filter((player): player is Player => Boolean(player))
        .map((player) => `${player.firstName} ${player.lastName} (#${player.number})`);

      const unavailable = match.unavailablePlayerIds
        .map((playerId) => players.get(playerId))
        .filter((player): player is Player => Boolean(player))
        .map((player) => `${player.firstName} ${player.lastName} (#${player.number})`);

      const scorers = (match.goalScorers ?? []).map((entry) => {
        const player = players.get(entry.playerId);
        return player
          ? `${player.firstName} ${player.lastName}: ${entry.goals} mål`
          : `${entry.playerId}: ${entry.goals} mål`;
      });

      return {
        opponent: match.opponentName,
        date: match.matchDate,
        location: match.location,
        formation: match.formationKey,
        result:
          match.homeScore !== undefined || match.awayScore !== undefined
            ? `${match.homeScore ?? 0}-${match.awayScore ?? 0}`
            : "Ej registrerat",
        starters,
        bench,
        unavailable,
        scorers,
      };
    })
    .map((entry, index) => `Match ${index + 1}:\n${JSON.stringify(entry, null, 2)}`)
    .join("\n\n");

  return `${question.trim()}\n\nUtgå från dessa matchdata och ge konkreta tränarrekommendationer på svenska:\n\n${matchSummary}`;
}

function DraggablePlayerChip({
  player,
  origin,
}: {
  player: Player;
  origin: "pool" | "bench" | "unavailable";
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${origin}:${player.id}`,
    data: { type: "player", playerId: player.id, origin },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className={clsx(
        "rounded-full border border-white/12 bg-slate-950/70 px-3 py-2 text-left text-sm text-white shadow-[0_10px_20px_rgba(2,6,23,0.2)] transition",
        isDragging && "opacity-35",
      )}
      {...listeners}
      {...attributes}
    >
      <span className="font-black text-amber-200">#{player.number}</span>
      <span className="ml-2 font-semibold uppercase tracking-[0.08em]">
        {player.lastName}
      </span>
      <span className="ml-2 text-white/65">{player.firstName}</span>
    </button>
  );
}

function PlayerDropBucket({
  id,
  title,
  players,
  emptyLabel,
}: {
  id: string;
  title: string;
  players: Player[];
  emptyLabel: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "bucket", bucket: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "rounded-[28px] border border-white/10 bg-black/18 p-5 transition",
        isOver && "border-amber-300/65 bg-amber-300/10",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-white/70">
          {title}
        </h3>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          {players.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.length > 0 ? (
          players.map((player) => (
            <DraggablePlayerChip
              key={`${id}-${player.id}`}
              player={player}
              origin={id === "bench-zone" ? "bench" : "unavailable"}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/12 px-4 py-4 text-sm text-white/45">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function TeamManagerApp() {
  const [state, setState] = useState<TeamAppState>(() => loadAppState());
  const [playerForm, setPlayerForm] = useState<PlayerFormState>(emptyPlayerForm);
  const [playerImageFile, setPlayerImageFile] = useState<File | null>(null);
  const [activeDragPlayerId, setActiveDragPlayerId] = useState<string | null>(null);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [matchPendingDelete, setMatchPendingDelete] = useState<MatchRecord | null>(null);
  const [isExporting, startExportTransition] = useTransition();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(supabaseConfigured);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiAnalysisSettings>(() => loadAiAnalysisSettings());
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const lastRemoteSnapshotRef = useRef("");
  const hasRemoteBootstrapRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    const localState = loadAppState();
    // Hydrating with saved local state keeps the workspace visible before auth completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(localState);

    if (!supabaseConfigured) {
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;

    void getSupabaseSessionUser()
      .then((user) => {
        if (isMounted) {
          setSessionUser(user);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSyncError(getErrorMessage(error, "Kunde inte läsa session."));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      });

    const unsubscribe = subscribeToSupabaseAuth((user) => {
      setSessionUser(user);
      setAuthMessage("");
      setIsAuthChecking(false);
      hasRemoteBootstrapRef.current = false;
      if (!user) {
        const fallbackState = loadAppState();
        setState(fallbackState);
        saveAppState(fallbackState);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !sessionUser) {
      return;
    }

    let cancelled = false;
    // We intentionally flip loading flags here before the async fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRemoteLoading(true);
    setSyncError(null);

    void loadRemoteTeamState(sessionUser)
      .then((remoteState) => {
        if (cancelled) {
          return;
        }

        setState(remoteState);
        saveAppState(remoteState);
        lastRemoteSnapshotRef.current = JSON.stringify(remoteState);
        hasRemoteBootstrapRef.current = true;
      })
      .catch((error) => {
        if (!cancelled) {
          setSyncError(getErrorMessage(error, "Kunde inte läsa från Supabase."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRemoteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  useEffect(() => {
    if (!supabaseConfigured || !sessionUser || !hasRemoteBootstrapRef.current) {
      return;
    }

    const snapshot = JSON.stringify(state);
    if (snapshot === lastRemoteSnapshotRef.current) {
      return;
    }

    setSyncMessage("Synkar mot Supabase...");
    const timeout = window.setTimeout(() => {
      void persistRemoteTeamState(state)
        .then(() => {
          lastRemoteSnapshotRef.current = snapshot;
          setSyncError(null);
          setSyncMessage("Synkad");
          window.setTimeout(() => setSyncMessage(null), 1400);
        })
        .catch((error) => {
          console.error("Supabase sync error:", error);
          const errorMessage = getErrorMessage(error, "Kunde inte spara till Supabase.");
          setSyncError(errorMessage);
          setSyncMessage(null);
        });
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state, sessionUser]);

  useEffect(() => {
    saveAiAnalysisSettings(aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    setAiSettings((current) => ({
      ...current,
      selectedMatchIds: current.selectedMatchIds.filter((matchId) =>
        state.matches.some((match) => match.id === matchId),
      ),
    }));
  }, [state.matches]);

  const selectedMatch =
    state.matches.find((match) => match.id === state.selectedMatchId) ?? state.matches[0] ?? null;

  const matchForm: MatchFormState = useMemo(
    () => ({
      matchDate: new Date().toISOString().slice(0, 16),
      opponentName: "",
      location: "",
      formationKey: DEFAULT_FORMATION_KEY,
    }),
    [],
  );
  const [newMatchForm, setNewMatchForm] = useState<MatchFormState>(matchForm);
  const [activeTab, setActiveTab] = useState<StudioTab>("players");

  const playerMap = useMemo(
    () => new Map(state.players.map((player) => [player.id, player])),
    [state.players],
  );

  const starterIds = useMemo(
    () =>
      new Set(
        selectedMatch?.lineupSlots
          .map((slot) => slot.playerId)
          .filter((playerId): playerId is string => Boolean(playerId)) ?? [],
      ),
    [selectedMatch],
  );

  const benchPlayers = useMemo(
    () =>
      (selectedMatch?.benchPlayerIds ?? [])
        .map((playerId) => playerMap.get(playerId))
        .filter((player): player is Player => Boolean(player)),
    [playerMap, selectedMatch?.benchPlayerIds],
  );

  const unavailablePlayers = useMemo(
    () =>
      (selectedMatch?.unavailablePlayerIds ?? [])
        .map((playerId) => playerMap.get(playerId))
        .filter((player): player is Player => Boolean(player)),
    [playerMap, selectedMatch?.unavailablePlayerIds],
  );

  const freePlayers = useMemo(
    () =>
      state.players.filter(
        (player) =>
          !starterIds.has(player.id) &&
          !selectedMatch?.benchPlayerIds.includes(player.id) &&
          !selectedMatch?.unavailablePlayerIds.includes(player.id),
      ),
    [selectedMatch?.benchPlayerIds, selectedMatch?.unavailablePlayerIds, starterIds, state.players],
  );

  const selectedMatchStarters = selectedMatch?.lineupSlots ?? [];
  const selectedMatchGoalSummary = useMemo(
    () =>
      (selectedMatch?.goalScorers ?? [])
        .map((entry) => ({
          ...entry,
          player: playerMap.get(entry.playerId),
        }))
        .filter((entry): entry is typeof entry & { player: Player } => Boolean(entry.player)),
    [playerMap, selectedMatch?.goalScorers],
  );
  const allTimeGoalLeaders = useMemo(() => {
    const totals = new Map<string, { goals: number; matches: number }>();

    for (const match of state.matches) {
      for (const scorer of match.goalScorers ?? []) {
        const current = totals.get(scorer.playerId) ?? { goals: 0, matches: 0 };
        totals.set(scorer.playerId, {
          goals: current.goals + scorer.goals,
          matches: current.matches + 1,
        });
      }
    }

    return sortPlayersByGoals(
      [...totals.entries()]
        .map(([playerId, totalsForPlayer]) => {
          const player = playerMap.get(playerId);
          if (!player) {
            return null;
          }

          return {
            player,
            goals: totalsForPlayer.goals,
            matches: totalsForPlayer.matches,
          };
        })
        .filter((entry): entry is { player: Player; goals: number; matches: number } => Boolean(entry)),
    );
  }, [playerMap, state.matches]);
  const selectedAiMatches = useMemo(
    () => state.matches.filter((match) => aiSettings.selectedMatchIds.includes(match.id)),
    [aiSettings.selectedMatchIds, state.matches],
  );

  function applyState(nextState: TeamAppState) {
    setState(nextState);
    saveAppState(nextState);
  }

  function updateAiSettings(patch: Partial<AiAnalysisSettings>) {
    setAiSettings((current) => ({ ...current, ...patch }));
  }

  function updateState(updater: (current: TeamAppState) => TeamAppState) {
    const nextState = updater(state);
    applyState(nextState);
  }

  function updateSelectedMatch(updater: (currentMatch: MatchRecord) => MatchRecord) {
    if (!selectedMatch) {
      return;
    }

    updateState((current) => ({
      ...current,
      matches: current.matches.map((match) =>
        match.id === selectedMatch.id ? updater(match) : match,
      ),
    }));
  }

  function updatePlayer(playerId: string, patch: Partial<Player>) {
    updateState((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, ...patch } : player,
      ),
    }));
  }

  function saveModalPlayer() {
    if (!selectedPlayerForModal) {
      return;
    }

    updatePlayer(selectedPlayerForModal.id, selectedPlayerForModal);
    setSelectedPlayerForModal(null);
  }

  async function handlePlayerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playerForm.firstName || !playerForm.lastName || !playerForm.number) {
      return;
    }

    const playerId = playerForm.id ?? crypto.randomUUID();
    let image = playerForm.image || undefined;

    if (supabaseConfigured && sessionUser && playerImageFile) {
      try {
        image = await uploadPlayerImage(sessionUser.id, playerId, playerImageFile);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Kunde inte ladda upp bilden.");
        return;
      }
    }

    updateState((current) => {
      const existingPlayer = current.players.find((player) => player.id === playerId);
      const basePlayer = {
        id: playerId,
        teamId: current.team.id,
        firstName: playerForm.firstName.trim(),
        lastName: playerForm.lastName.trim(),
        number: playerForm.number.trim(),
        image,
        smallCardCropArea: existingPlayer?.smallCardCropArea ?? { x: 50, y: 50, width: 100, height: 100 },
        smallCardShowName: existingPlayer?.smallCardShowName ?? true,
        smallCardShowPosition: existingPlayer?.smallCardShowPosition ?? true,
        smallCardShowNumber: existingPlayer?.smallCardShowNumber ?? true,
        largeCardImageFocus: existingPlayer?.largeCardImageFocus ?? "full",
        yellowCards: existingPlayer?.yellowCards ?? 0,
        redCards: existingPlayer?.redCards ?? 0,
        traits: existingPlayer?.traits ?? [],
        createdAt:
          existingPlayer?.createdAt ?? new Date().toISOString(),
      };

      const players = playerForm.id
        ? current.players.map((player) =>
            player.id === playerForm.id ? { ...player, ...basePlayer } : player,
          )
        : [...current.players, basePlayer];

      return { ...current, players };
    });

    setPlayerForm(emptyPlayerForm);
    setPlayerImageFile(null);
  }

  function handleDeletePlayer(playerId: string) {
    updateState((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== playerId),
      matches: current.matches.map((match) => removePlayerEverywhere(match, playerId)),
    }));

    if (playerForm.id === playerId) {
      setPlayerForm(emptyPlayerForm);
      setPlayerImageFile(null);
    }
  }

  function handlePlayerImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPlayerImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPlayerForm((current) => ({
        ...current,
        image: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleCreateMatch(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!newMatchForm.opponentName || !newMatchForm.location || !newMatchForm.matchDate) {
    return;
  }

  const match = createMatchState(newMatchForm, state.team.id);

  updateState((current) => ({
    ...current,
    matches: [match, ...current.matches],
    selectedMatchId: match.id,
  }));

  setNewMatchForm(matchForm);
  setActiveTab("lineup");
}

  function handleDeleteMatch(matchId: string) {
    updateState((current) => {
      const remainingMatches = current.matches.filter((match) => match.id !== matchId);
      const nextSelectedMatchId =
        current.selectedMatchId === matchId
          ? remainingMatches[0]?.id ?? null
          : current.selectedMatchId;

      return {
        ...current,
        matches: remainingMatches,
        selectedMatchId: nextSelectedMatchId,
      };
    });

    setMatchPendingDelete(null);
    setActiveTab("matches");
  }

  function handleAssignPlayer(slotKey: string, playerId: string | null) {
    updateSelectedMatch((match) => {
      if (!playerId) {
        return {
          ...match,
          lineupSlots: match.lineupSlots.map((slot) =>
            slot.slotKey === slotKey ? { ...slot, playerId: null } : slot,
          ),
        };
      }

      const cleaned = removePlayerEverywhere(match, playerId);

      return {
        ...cleaned,
        status: "ready",
        lineupSlots: cleaned.lineupSlots.map((slot) =>
          slot.slotKey === slotKey ? { ...slot, playerId } : slot,
        ),
      };
    });
  }

  function handleMovePlayerToBucket(playerId: string, bucket: "bench-zone" | "unavailable-zone") {
    updateSelectedMatch((match) => {
      const cleaned = removePlayerEverywhere(match, playerId);
      if (bucket === "bench-zone") {
        return {
          ...cleaned,
          benchPlayerIds: [...cleaned.benchPlayerIds, playerId],
        };
      }

      return {
        ...cleaned,
        unavailablePlayerIds: [...cleaned.unavailablePlayerIds, playerId],
      };
    });
  }

  function handleSlotOffset(slotKey: string, offsetX: number, offsetY: number) {
    updateSelectedMatch((match) => ({
      ...match,
      lineupSlots: match.lineupSlots.map((slot) =>
        slot.slotKey === slotKey ? { ...slot, manualOffsetX: offsetX, manualOffsetY: offsetY } : slot,
      ),
    }));
  }

  function handleResetSlot(slotKey: string) {
    handleSlotOffset(slotKey, 0, 0);
  }

  function handleGoalCountChange(playerId: string, goalCount: number) {
    updateSelectedMatch((match) => {
      const currentScorers = match.goalScorers ?? [];
      const filteredScorers = currentScorers.filter((entry) => entry.playerId !== playerId);

      if (goalCount <= 0) {
        return {
          ...match,
          goalScorers: filteredScorers.length > 0 ? filteredScorers : undefined,
        };
      }

      return {
        ...match,
        goalScorers: [...filteredScorers, { playerId, goals: goalCount }].sort((a, b) =>
          a.playerId.localeCompare(b.playerId),
        ),
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;

    setActiveDragPlayerId(null);

    if (!activeData || activeData.type !== "player") {
      return;
    }

    const playerId = activeData.playerId as string;

    if (!event.over || !overData) {
      return;
    }

    if (overData.type === "slot") {
      handleAssignPlayer(overData.slotKey as string, playerId);
      return;
    }

    if (
      overData.type === "bucket" &&
      (overData.bucket === "bench-zone" || overData.bucket === "unavailable-zone")
    ) {
      handleMovePlayerToBucket(playerId, overData.bucket);
    }
  }

  function downloadExport() {
    if (!exportRef.current || !selectedMatch) {
      return;
    }

    startExportTransition(async () => {
      const dataUrl = await toPng(exportRef.current!, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `start-9-${selectedMatch.opponentName
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    });
  }

  async function handleRunAiAnalysis() {
    const endpoint = aiSettings.endpoint.trim().replace(/\/+$/, "");
    const deployment = aiSettings.deployment.trim();
    const apiKey = aiSettings.apiKey.trim();

    if (!endpoint || !deployment || !apiKey) {
      setAiError("Fyll i endpoint, deployment och API-nyckel för Azure AI.");
      return;
    }

    if (selectedAiMatches.length === 0) {
      setAiError("Välj minst en match att analysera.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiResponse("");

    try {
      const response = await fetch(`${endpoint}/openai/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          model: deployment,
          input: `Du ar en svensk fotbollsanalytiker for ungdoms- och 9v9-fotboll. Ge konkreta, pedagogiska rekommendationer pa svenska.\n\n${buildAiAnalysisPrompt(selectedAiMatches, playerMap, aiSettings.question)}`,
          max_output_tokens: 900,
        }),
      });

      const payload = (await response.json()) as {
        error?: { message?: string };
        output?: Array<{
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        }>;
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Azure AI svarade med ett fel.");
      }

      const content = payload.output
        ?.flatMap((item) => item.content ?? [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text ?? "")
        .join("\n")
        .trim();

      if (!content) {
        throw new Error("Azure AI returnerade inget analysinnehåll.");
      }

      setAiResponse(content);
    } catch (error) {
      setAiError(getErrorMessage(error, "Kunde inte köra AI-analysen."));
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleSendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authEmail) {
      return;
    }

    setIsAuthBusy(true);
    setSyncError(null);

    try {
      await signInLeader(authEmail);
      setAuthMessage("Magisk länk skickad. Öppna mailet och logga in.");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Kunde inte skicka inloggningslänk.");
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setIsAuthBusy(true);

    try {
      await signOutLeader();
      setAuthMessage("Du är utloggad.");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Kunde inte logga ut.");
    } finally {
      setIsAuthBusy(false);
    }
  }

  if (isAuthChecking || isRemoteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111d] text-white">
        Laddar lagcentralen...
      </div>
    );
  }

  if (!selectedMatch && activeTab !== "matches") {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111d] text-white">
      Laddar lagcentralen...
    </div>
  );
}

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const activeData = event.active.data.current;
        if (activeData?.type === "player") {
          setActiveDragPlayerId(activeData.playerId as string);
        }
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-10">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,#081120_0%,#0e2234_48%,#112c22_100%)] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.36)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.18),_transparent_24%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-amber-100">
                <Sparkles size={14} />
                Privat ledarläge
              </p>
              <h1 className="mt-5 text-4xl font-black uppercase tracking-[0.08em] text-white sm:text-6xl">
                Start 9 Studio
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200/76 sm:text-lg">
                Desktopvy för ledaren med tydliga sektioner för matchdetaljer, laguppställning
                och lagmedlemmar. Exporten byggs som ett färdigt Whatsapp-kort.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Spelare</p>
                <p className="mt-2 text-3xl font-black text-white">{state.players.length}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Matcher</p>
                <p className="mt-2 text-3xl font-black text-white">{state.matches.length}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Lagring</p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-amber-100">
                  {supabaseConfigured ? (sessionUser ? "Supabase live" : "Förhandsläge") : "Lokalt läge"}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {supabaseConfigured && !sessionUser
                    ? "Planen visas direkt, logga in för synk."
                    : syncMessage ?? "Allt sparas i aktuell arbetsyta."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={!supabaseConfigured || isAuthBusy}
                className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 text-left disabled:opacity-60"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Ledare</p>
                <p className="mt-2 truncate text-sm font-black uppercase tracking-[0.08em] text-white">
                  {sessionUser?.email ?? "Ej inloggad"}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/68">
                  <LogOut size={14} />
                  Logga ut
                </p>
              </button>
            </div>
          </div>
        </section>

        {syncError ? (
          <div className="rounded-[28px] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {syncError}
          </div>
        ) : null}

        <section className="rounded-[32px] border border-white/10 bg-slate-950/45 p-3 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
          <div className="flex flex-wrap gap-3">
           {[
 { key: "players", label: "Lagmedlemmar" },
  { key: "matches", label: "Matchlista" },
  { key: "lineup", label: "Laguppställning", disabled: !selectedMatch },
  { key: "export", label: "Whatsapp-export", disabled: !selectedMatch },
  { key: "analysis", label: "AI analys" },
].map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
  key={tab.key}
  type="button"
  disabled={tab.disabled}
  onClick={() => setActiveTab(tab.key as StudioTab)}
  className={clsx(
    "rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.16em] transition",
    isActive
      ? "bg-amber-300 text-slate-950"
      : "border border-white/10 bg-white/6 text-white/72 hover:bg-white/10",
    tab.disabled && "cursor-not-allowed opacity-40 hover:bg-white/6",
  )}
>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {activeTab === "players" ? (
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
            {supabaseConfigured && !sessionUser ? (
              <div className="mb-5 rounded-[28px] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(15,23,42,0.55))] p-5 shadow-[0_20px_45px_rgba(2,6,23,0.18)]">
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-amber-100">
                  <Shield size={14} />
                  Supabase inloggning
                </p>
                <h2 className="mt-4 text-2xl font-black uppercase tracking-[0.08em] text-white">
                  Logga in för att spara live
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-200/76">
                  Arbetsytan och planen är synliga redan nu. Logga in med mail när du vill börja
                  synka spelare, matcher och uppställningar till Supabase.
                </p>

                <form className="mt-4 space-y-3" onSubmit={handleSendMagicLink}>
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/68">E-postadress</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                      <Mail size={18} className="text-amber-100/75" />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="du@klubb.se"
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={isAuthBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-3 font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
                  >
                    <Mail size={16} />
                    {isAuthBusy ? "Skickar..." : "Skicka magisk länk"}
                  </button>
                </form>

                {authMessage ? (
                  <p className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    {authMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mb-4 flex items-center gap-3">
              <Users className="text-amber-200" />
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  Lagmedlemmar
                </h2>
                <p className="text-sm text-white/60">Bygg truppen och välj vilket kort som ska användas.</p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={(event) => void handlePlayerSubmit(event)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={playerForm.firstName}
                  onChange={(event) =>
                    setPlayerForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                  placeholder="Förnamn"
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                />
                <input
                  value={playerForm.lastName}
                  onChange={(event) =>
                    setPlayerForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                  placeholder="Efternamn"
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                />
              </div>
              <input
                value={playerForm.number}
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, number: event.target.value }))
                }
                placeholder="Tröjnummer"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
              <label className="block rounded-2xl border border-dashed border-white/16 bg-white/5 px-4 py-3 text-sm text-white/65">
                Ladda upp spelarbild
                <input type="file" accept="image/*" className="mt-2 block w-full" onChange={handlePlayerImage} />
              </label>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-3 font-black uppercase tracking-[0.16em] text-slate-950"
                >
                  <Plus size={16} />
                  {playerForm.id ? "Spara spelare" : "Lägg till spelare"}
                </button>
                {playerForm.id ? (
                  <button
                    type="button"
                    className="rounded-full border border-white/10 px-4 py-3 text-sm text-white/70"
                    onClick={() => {
                      setPlayerForm(emptyPlayerForm);
                      setPlayerImageFile(null);
                    }}
                  >
                    Avbryt
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {state.players.length > 0 ? (
                state.players.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-[24px] border border-white/10 bg-white/6 p-3 transition hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => {
                          setPlayerForm({
                            id: player.id,
                            firstName: player.firstName,
                            lastName: player.lastName,
                            number: player.number,
                            image: player.image,
                          });
                          setPlayerImageFile(null);
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-amber-100/78">
                              #{player.number}
                            </p>
                            <p className="mt-1 text-lg font-black uppercase tracking-[0.08em] text-white">
                              {player.lastName}
                            </p>
                            <p className="text-sm text-white/62">{player.firstName}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/60">
                              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1">
                                Gula: {player.yellowCards ?? 0}
                              </span>
                              <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1">
                                Röda: {player.redCards ?? 0}
                              </span>
                              {(player.traits ?? []).slice(0, 2).map((trait) => (
                                <span
                                  key={trait}
                                  className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1"
                                >
                                  {trait}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="w-[118px] shrink-0">
                            <PlayerCard
                              player={player}
                              positionLabel="Squad"
                              variant="compact"
                              showName={player.smallCardShowName ?? true}
                              showPosition={player.smallCardShowPosition ?? true}
                              showNumber={player.smallCardShowNumber ?? true}
                              onDoubleClick={() => setSelectedPlayerForModal({ ...player })}
                            />
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-rose-200 transition hover:bg-rose-400/20"
                        onClick={() => handleDeletePlayer(player.id)}
                      >
                        <Trash2 size={16} />
                        Ta bort
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-[24px] border border-dashed border-white/12 px-4 py-5 text-sm text-white/45">
                  Börja med att lägga till spelare i truppen.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "matches" ? (
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
            <div className="mb-4 flex items-center gap-3">
              <CalendarDays className="text-emerald-200" />
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  Matchlista
                </h2>
                <p className="text-sm text-white/60">Skapa match och välj vilken uppställning du jobbar med.</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <form className="space-y-3 rounded-[28px] border border-white/10 bg-black/18 p-5" onSubmit={handleCreateMatch}>
                <input
                  type="datetime-local"
                  value={newMatchForm.matchDate}
                  onChange={(event) =>
                    setNewMatchForm((current) => ({ ...current, matchDate: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                />
                <input
                  value={newMatchForm.opponentName}
                  onChange={(event) =>
                    setNewMatchForm((current) => ({
                      ...current,
                      opponentName: event.target.value,
                    }))
                  }
                  placeholder="Motståndare"
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                />
                <input
                  value={newMatchForm.location}
                  onChange={(event) =>
                    setNewMatchForm((current) => ({ ...current, location: event.target.value }))
                  }
                  placeholder="Plats"
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                />
                <select
                  value={newMatchForm.formationKey}
                  onChange={(event) =>
                    setNewMatchForm((current) => ({
                      ...current,
                      formationKey: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                >
                  {FORMATION_TEMPLATES.map((formation) => (
                    <option key={formation.key} value={formation.key}>
                      {formation.label} • {formation.description}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-black uppercase tracking-[0.16em] text-slate-950"
                >
                  <Plus size={16} />
                  Ny match
                </button>
              </form>

              <div className="space-y-3">
  {state.matches.length > 0 ? (
    state.matches.map((match) => (
      <div
        key={match.id}
        className={clsx(
          "w-full rounded-[24px] border p-4 transition",
          state.selectedMatchId === match.id
            ? "border-amber-300/60 bg-amber-300/10"
            : "border-white/10 bg-white/6 hover:bg-white/10",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() =>
              updateState((current) => ({ ...current, selectedMatchId: match.id }))
            }
          >
            <p className="text-xs uppercase tracking-[0.26em] text-white/55">
              {formatShortDate(match.matchDate)}
            </p>
            <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-white">
              {match.opponentName}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
              <MapPin size={14} />
              {match.location}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMatchPendingDelete(match)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/20"
            aria-label={`Ta bort match mot ${match.opponentName}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    ))
  ) : (
    <div className="rounded-[24px] border border-dashed border-white/12 px-5 py-8 text-sm text-white/55">
      Ingen match skapad ännu. Fyll i formuläret till vänster för att skapa den första matchen.
    </div>
  )}
</div>
            </div>
          </section>
        ) : null}

       {activeTab === "lineup" && selectedMatch ? (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-amber-100/72">
                    Matchdetaljer
                  </p>
                  <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
                    {selectedMatch.opponentName}
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/66">
                  {selectedMatch.formationKey}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <label className="text-xs uppercase tracking-[0.28em] text-white/50">Datum & Tid</label>
                  <input
                    type="datetime-local"
                    value={selectedMatch.matchDate}
                    onChange={(event) =>
                      updateSelectedMatch((match) => ({ ...match, matchDate: event.target.value }))
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-white outline-none"
                  />
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <label className="text-xs uppercase tracking-[0.28em] text-white/50">Motståndare</label>
                  <input
                    type="text"
                    value={selectedMatch.opponentName}
                    onChange={(event) =>
                      updateSelectedMatch((match) => ({ ...match, opponentName: event.target.value }))
                    }
                    placeholder="Motståndare"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-white outline-none placeholder:text-white/35"
                  />
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <label className="text-xs uppercase tracking-[0.28em] text-white/50">Plats</label>
                  <input
                    type="text"
                    value={selectedMatch.location}
                    onChange={(event) =>
                      updateSelectedMatch((match) => ({ ...match, location: event.target.value }))
                    }
                    placeholder="Plats"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-white outline-none placeholder:text-white/35"
                  />
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <label className="text-xs uppercase tracking-[0.28em] text-white/50">Resultat</label>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={selectedMatch.homeScore ?? ""}
                      onChange={(event) =>
                        updateSelectedMatch((match) => ({ 
                          ...match, 
                          homeScore: event.target.value ? parseInt(event.target.value) : undefined 
                        }))
                      }
                      placeholder="Vi"
                      className="w-16 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-center text-white outline-none placeholder:text-white/35"
                    />
                    <span className="text-white/50">-</span>
                    <input
                      type="number"
                      min="0"
                      value={selectedMatch.awayScore ?? ""}
                      onChange={(event) =>
                        updateSelectedMatch((match) => ({ 
                          ...match, 
                          awayScore: event.target.value ? parseInt(event.target.value) : undefined 
                        }))
                      }
                      placeholder="Dom"
                      className="w-16 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-center text-white outline-none placeholder:text-white/35"
                    />
                  </div>
                </div>
              </div>

              {(selectedMatch.homeScore !== undefined || selectedMatch.awayScore !== undefined) && (
                <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <label className="text-xs uppercase tracking-[0.28em] text-white/50">Målskyttar</label>
                      <p className="mt-2 text-sm text-white/58">
                        Välj hur många mål varje spelare gjorde i matchen. Listan sparas och bygger er skytteliga över tid.
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/65">
                      Totalt i matchen: {selectedMatchGoalSummary.reduce((sum, entry) => sum + entry.goals, 0)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {state.players.map((player) => {
                      const currentGoals =
                        selectedMatch.goalScorers?.find((entry) => entry.playerId === player.id)?.goals ?? 0;

                      return (
                        <div
                          key={player.id}
                          className={clsx(
                            "flex items-center justify-between gap-3 rounded-[20px] border px-3 py-3 transition",
                            currentGoals > 0
                              ? "border-emerald-400/40 bg-emerald-400/10"
                              : "border-white/10 bg-black/18",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-[0.08em] text-white">
                              #{player.number} {player.lastName}
                            </p>
                            <p className="text-xs text-white/56">{player.firstName}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {[0, 1, 2, 3, 4, 5].map((goalCount) => (
                              <button
                                key={goalCount}
                                type="button"
                                onClick={() => handleGoalCountChange(player.id, goalCount)}
                                className={clsx(
                                  "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-black transition",
                                  currentGoals === goalCount
                                    ? "border-amber-300 bg-amber-300 text-slate-950"
                                    : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10",
                                )}
                                aria-label={`${player.firstName} ${player.lastName} gjorde ${goalCount} mål`}
                              >
                                {goalCount}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[20px] border border-white/10 bg-black/18 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/48">Målskyttar i vald match</p>
                      <div className="mt-3 space-y-2">
                        {selectedMatchGoalSummary.length > 0 ? (
                          selectedMatchGoalSummary.map((entry) => (
                            <div
                              key={entry.playerId}
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
                            >
                              <span className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
                                #{entry.player.number} {entry.player.lastName}
                              </span>
                              <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-950">
                                {entry.goals} mål
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-2xl border border-dashed border-white/12 px-4 py-4 text-sm text-white/45">
                            Inga målskyttar valda ännu.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-black/18 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/48">Skytteliga totalt</p>
                      <div className="mt-3 space-y-2">
                        {allTimeGoalLeaders.length > 0 ? (
                          allTimeGoalLeaders.slice(0, 8).map((entry) => (
                            <div
                              key={entry.player.id}
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-black uppercase tracking-[0.08em] text-white">
                                  #{entry.player.number} {entry.player.lastName}
                                </p>
                                <p className="text-xs text-white/52">{entry.matches} matcher med mål</p>
                              </div>
                              <span className="text-lg font-black text-emerald-200">{entry.goals}</span>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-2xl border border-dashed border-white/12 px-4 py-4 text-sm text-white/45">
                            Skytteligan börjar fyllas när ni registrerar målskyttar.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-amber-100/76">Laguppställning</p>
                  <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
                    Bygg startnian visuellt
                  </h2>
                  <p className="mt-2 text-white/60">
                    Välj formation, placera spelarkort och finjustera ytorna på planen.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedMatch.formationKey}
                    onChange={(event) =>
                      updateSelectedMatch((match) =>
                        remapMatchFormation(match, event.target.value),
                      )
                    }
                    className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-white outline-none"
                  >
                    {FORMATION_TEMPLATES.map((formation) => (
                      <option key={formation.key} value={formation.key}>
                        {formation.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white"
                    onClick={() =>
                      updateSelectedMatch((match) => ({
                        ...match,
                        lineupSlots: createLineupSlots(match.formationKey),
                        benchPlayerIds: [],
                        unavailablePlayerIds: [],
                      }))
                    }
                  >
                    Nollställ uppställning
                  </button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <PitchBoard
                  slots={selectedMatch.lineupSlots}
                  players={state.players}
                  onAssignPlayer={handleAssignPlayer}
                  onMoveSlot={handleSlotOffset}
                  onResetSlot={handleResetSlot}
                  onDoubleClick={(player) => setSelectedPlayerForModal(player)}
                />

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/10 bg-black/18 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/70">
                      Fri trupp
                    </h3>
                    <p className="mt-2 text-sm text-white/52">
                      Dra spelare till planen, bänken eller frånvarande. Sektionen är gjord för desktop.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {freePlayers.length > 0 ? (
                        freePlayers.map((player) => (
                          <DraggablePlayerChip key={player.id} player={player} origin="pool" />
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-white/12 px-4 py-4 text-sm text-white/45">
                          Alla spelare är redan placerade.
                        </p>
                      )}
                    </div>
                  </div>

                  <PlayerDropBucket
                    id="bench-zone"
                    title="Avbytare"
                    players={benchPlayers}
                    emptyLabel="Dra hit de spelare som ska börja på bänken."
                  />

                  <PlayerDropBucket
                    id="unavailable-zone"
                    title="Frånvarande"
                    players={unavailablePlayers}
                    emptyLabel="Dra hit de spelare som saknas eller inte är uttagna."
                  />
                </div>
              </div>
            </section>
          </div>
        ) : null}

       {activeTab === "analysis" ? (
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
            <div className="mb-4 flex items-center gap-3">
              <Bot className="text-cyan-200" />
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  AI analys
                </h2>
                <p className="text-sm text-white/60">
                  Koppla Azure AI, välj matcher och be om konkreta rekommendationer.
                </p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-4 rounded-[28px] border border-white/10 bg-black/18 p-5">
                <div className="space-y-3">
                  <input
                    value={aiSettings.endpoint}
                    onChange={(event) => updateAiSettings({ endpoint: event.target.value })}
                    placeholder="Azure endpoint"
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                  />
                  <input
                    value={aiSettings.deployment}
                    onChange={(event) => updateAiSettings({ deployment: event.target.value })}
                    placeholder="Deployment-namn"
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                  />
                  <input
                    type="password"
                    value={aiSettings.apiKey}
                    onChange={(event) => updateAiSettings({ apiKey: event.target.value })}
                    placeholder="API-nyckel"
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/50">Fråga till AI</p>
                  <textarea
                    value={aiSettings.question}
                    onChange={(event) => updateAiSettings({ question: event.target.value })}
                    rows={6}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleRunAiAnalysis()}
                  disabled={isAiLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
                >
                  {isAiLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                  {isAiLoading ? "Analyserar..." : "Kör analys"}
                </button>

                <div className="rounded-[20px] border border-white/10 bg-white/6 p-4 text-sm leading-6 text-white/65">
                  Matchernas formation, resultat, målskyttar, startnia, bänk och frånvarande skickas med i analysunderlaget.
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-black/18 p-5">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Välj matcher</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {state.matches.map((match) => {
                      const isSelected = aiSettings.selectedMatchIds.includes(match.id);

                      return (
                        <label
                          key={match.id}
                          className={clsx(
                            "flex cursor-pointer items-start gap-3 rounded-[22px] border px-4 py-4 transition",
                            isSelected
                              ? "border-cyan-300/40 bg-cyan-300/10"
                              : "border-white/10 bg-white/6 hover:bg-white/10",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) =>
                              updateAiSettings({
                                selectedMatchIds: event.target.checked
                                  ? [...aiSettings.selectedMatchIds, match.id]
                                  : aiSettings.selectedMatchIds.filter((id) => id !== match.id),
                              })
                            }
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-[0.08em] text-white">
                              {match.opponentName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/52">
                              {formatShortDate(match.matchDate)} • {match.formationKey}
                            </p>
                            <p className="mt-2 text-sm text-white/62">{match.location}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {aiError ? (
                  <div className="rounded-[24px] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {aiError}
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-white/10 bg-black/18 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Svar från AI</p>
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/52">
                      {selectedAiMatches.length} valda matcher
                    </span>
                  </div>
                  <div className="mt-4 min-h-[360px] rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm leading-7 text-white/80">
                    {aiResponse ? (
                      <pre className="whitespace-pre-wrap font-sans">{aiResponse}</pre>
                    ) : (
                      <p className="text-white/45">
                        Välj matcher och kör analysen för att få konkreta förslag från AI.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

       {activeTab === "export" && selectedMatch ? (
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
            <div className="mb-4 flex items-center gap-3">
              <Shield className="text-cyan-200" />
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  Whatsapp-export
                </h2>
                <p className="text-sm text-white/60">Förhandsvisning av färdigt delningskort.</p>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-black/22 p-4">
              <div className="mx-auto aspect-[4/5] w-full max-w-[540px] overflow-hidden rounded-[28px] bg-[#050c18]">
                <div
                  className="origin-top-left"
                  style={{
                    width: 1080,
                    height: 1350,
                    transform: "scale(0.5)",
                    transformOrigin: "top left",
                  }}
                >
                  <ExportStory
                    team={state.team}
                    match={selectedMatch}
                    starters={selectedMatchStarters}
                    bench={benchPlayers}
                    unavailable={unavailablePlayers}
                    getPlayer={(playerId) => (playerId ? playerMap.get(playerId) : undefined)}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadExport}
              disabled={isExporting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
            >
              <Download size={16} />
              {isExporting ? "Genererar..." : "Exportera PNG"}
            </button>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm leading-6 text-white/62">
              {supabaseConfigured
                ? "Laguppställningen synkas mot Supabase och exporten är anpassad för delning i Whatsapp."
                : "Uppställningen sparas lokalt i webbläsaren i demo-läge."}
            </div>
          </section>
        ) : null}
      </div>

      <div className="pointer-events-none absolute -left-[9999px] top-0">
        <div ref={exportRef} className="h-[1350px] w-[1080px]">
          <ExportStory
            team={state.team}
            match={selectedMatch}
            starters={selectedMatchStarters}
            bench={benchPlayers}
            unavailable={unavailablePlayers}
            getPlayer={(playerId) => (playerId ? playerMap.get(playerId) : undefined)}
          />
        </div>
      </div>

      {selectedPlayerForModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setSelectedPlayerForModal(null)}>
          <div className="relative z-[10000] w-full max-w-7xl p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-black uppercase tracking-[0.22em] text-white">
                Redigera spelare
              </h1>
              <button
                type="button"
                onClick={() => setSelectedPlayerForModal(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:border-white/30 hover:bg-white/10 transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid max-h-[calc(100vh-7rem)] gap-6 overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.55)] xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-lg font-black uppercase tracking-[0.22em] text-white">
                    {selectedPlayerForModal.firstName} {selectedPlayerForModal.lastName}
                  </h2>
                  <p className="text-sm text-white/60">#{selectedPlayerForModal.number}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-4">
                  <div className="relative min-h-[420px] overflow-hidden rounded-[28px] border-2 border-cyan-400/70 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.2),transparent_34%),linear-gradient(180deg,#020617_0%,#06112a_60%,#020617_100%)]">
                    {selectedPlayerForModal.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedPlayerForModal.image}
                        alt={`${selectedPlayerForModal.firstName} ${selectedPlayerForModal.lastName}`}
                        className="absolute inset-0 h-full w-full object-contain object-center p-6"
                      />
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center text-8xl font-black text-white/90">
                        {`${selectedPlayerForModal.firstName?.[0] ?? "?"}${selectedPlayerForModal.lastName?.[0] ?? ""}`.toUpperCase()}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_45%,rgba(2,6,23,0.18)_68%,rgba(2,6,23,0.88)_100%)]" />
                    <div className="absolute left-4 top-4 rounded-full border border-cyan-300/50 bg-slate-950/88 px-3 py-2 text-lg font-black leading-none text-white shadow-[0_6px_18px_rgba(2,6,23,0.4)] backdrop-blur-sm">
                      #{selectedPlayerForModal.number}
                    </div>
                    <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-white/10 bg-slate-950/88 px-4 py-4 text-white/95 backdrop-blur-md">
                      <p className="text-xl font-black uppercase leading-none tracking-[0.08em] text-cyan-100">
                        {selectedPlayerForModal.firstName} {selectedPlayerForModal.lastName}
                      </p>
                      <p className="mt-2 text-sm uppercase tracking-[0.24em] text-white/68">Spelare</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Förhandsvisning</p>
                  <div className="mt-4 flex justify-center">
                    <div className="w-[160px]">
                      <PlayerCard
                        player={selectedPlayerForModal}
                        positionLabel="FW"
                        variant="face"
                        showName={selectedPlayerForModal.smallCardShowName ?? true}
                        showPosition={selectedPlayerForModal.smallCardShowPosition ?? true}
                        showNumber={selectedPlayerForModal.smallCardShowNumber ?? true}
                        enableZoom={false}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs uppercase tracking-[0.24em] text-white/50">
                    Så här ser det ut på planen
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Anpassa bildområde</p>
                      <p className="mt-1 text-xs text-white/50">
                        Markera området som ska visas på lilla kortet. Editorn använder nu hela arbetsytan.
                      </p>
                    </div>
                    {selectedPlayerForModal.image ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPlayerForModal((current) =>
                            current ? { ...current, smallCardCropArea: { x: 50, y: 50, width: 100, height: 100 } } : current
                          )
                        }
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75 transition hover:border-white/20 hover:bg-white/10"
                      >
                        Återställ crop-område
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-4">
                    {selectedPlayerForModal.image ? (
                      <div className="h-[min(62vh,720px)]">
                        <ImageCropper
                          imageUrl={selectedPlayerForModal.image}
                          initialCrop={selectedPlayerForModal.smallCardCropArea || { x: 50, y: 50, width: 100, height: 100 }}
                          onCropChange={(crop) =>
                            setSelectedPlayerForModal((current) =>
                              current ? { ...current, smallCardCropArea: crop } : current
                            )
                          }
                          aspectRatio={1}
                          minCropSize={30}
                        />
                      </div>
                    ) : (
                      <div className="flex h-[min(62vh,720px)] items-center justify-center rounded-[24px] bg-slate-800 text-white/60">
                        Ingen bild uppladdad
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Spelarinformation</p>
                  <div className="mt-4 space-y-3 text-white/80">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Namn</p>
                      <p className="mt-1 text-lg font-black uppercase tracking-[0.06em] text-white">
                        {selectedPlayerForModal.firstName} {selectedPlayerForModal.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Numero</p>
                      <p className="mt-1 text-lg font-black uppercase tracking-[0.06em] text-white">
                        #{selectedPlayerForModal.number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Om kortet</p>
                      <p className="mt-1 text-sm text-white/70">
                        Här kan du anpassa hur spelaren visas på planen. Välj bildfokus och vilka delar som ska synas på lilla kortet.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Kort och attribut</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-amber-100/70">Gula kort</p>
                      <div className="mt-3 flex items-center gap-2">
                        {[0, 1, 2, 3, 4].map((value) => (
                          <button
                            key={`yellow-${value}`}
                            type="button"
                            onClick={() =>
                              setSelectedPlayerForModal((current) =>
                                current ? { ...current, yellowCards: value } : current,
                              )
                            }
                            className={clsx(
                              "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-black transition",
                              (selectedPlayerForModal.yellowCards ?? 0) === value
                                ? "border-amber-300 bg-amber-300 text-slate-950"
                                : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10",
                            )}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-rose-100/70">Röda kort</p>
                      <div className="mt-3 flex items-center gap-2">
                        {[0, 1, 2].map((value) => (
                          <button
                            key={`red-${value}`}
                            type="button"
                            onClick={() =>
                              setSelectedPlayerForModal((current) =>
                                current ? { ...current, redCards: value } : current,
                              )
                            }
                            className={clsx(
                              "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-black transition",
                              (selectedPlayerForModal.redCards ?? 0) === value
                                ? "border-rose-300 bg-rose-400 text-white"
                                : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10",
                            )}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Personliga attribut</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {PLAYER_TRAIT_OPTIONS.map((trait) => {
                        const isSelected = (selectedPlayerForModal.traits ?? []).includes(trait);

                        return (
                          <button
                            key={trait}
                            type="button"
                            onClick={() =>
                              setSelectedPlayerForModal((current) => {
                                if (!current) {
                                  return current;
                                }

                                const traits = current.traits ?? [];
                                return {
                                  ...current,
                                  traits: isSelected
                                    ? traits.filter((entry) => entry !== trait)
                                    : [...traits, trait],
                                };
                              })
                            }
                            className={clsx(
                              "rounded-full border px-4 py-2 text-sm font-semibold transition",
                              isSelected
                                ? "border-cyan-300/40 bg-cyan-300/20 text-cyan-100"
                                : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10",
                            )}
                          >
                            {trait}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/70">Visa på lilla kortet</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      { key: "smallCardShowName", label: "Visa namn" },
                      { key: "smallCardShowPosition", label: "Visa position" },
                      { key: "smallCardShowNumber", label: "Visa nummer" },
                    ].map((field) => (
                      <label key={field.key} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80 transition cursor-pointer hover:border-white/20 hover:bg-white/10">
                        <input
                          type="checkbox"
                          checked={Boolean((selectedPlayerForModal as any)[field.key])}
                          onChange={(event) =>
                            setSelectedPlayerForModal((current) =>
                              current
                                ? {
                                    ...current,
                                    [field.key]: event.target.checked,
                                  }
                                : current,
                            )
                          }
                          className="h-5 w-5 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-2 focus:ring-cyan-400"
                        />
                        <span className="font-medium">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={saveModalPlayer}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Spara inställningar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerForModal(null)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Stäng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {matchPendingDelete ? (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setMatchPendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-rose-200/70">Ta bort match</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">
              {matchPendingDelete.opponentName}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Är du säker på att du vill ta bort den här matchen? Uppställning, bänk, frånvarande och målstatistik för matchen försvinner också.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleDeleteMatch(matchPendingDelete.id)}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-rose-500 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-rose-400"
              >
                Ta bort
              </button>
              <button
                type="button"
                onClick={() => setMatchPendingDelete(null)}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white/80 transition hover:border-white/20 hover:bg-white/10"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DragOverlay>
        {activeDragPlayerId ? (
          <div className="w-[220px]">
            <PlayerCard
              player={playerMap.get(activeDragPlayerId)}
              positionLabel="Drag"
              variant="compact"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
