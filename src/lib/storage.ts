import { DEFAULT_FORMATION_KEY, createLineupSlots } from "@/lib/formations";
import { AiAnalysisSettings, MatchRecord, Player, TeamAppState } from "@/lib/types";

const STORAGE_KEY = "football-team-manager-state";
const AI_STORAGE_KEY = "football-team-manager-ai-settings";

export const defaultTeamState: TeamAppState = {
  team: {
    id: "team-main",
    name: "Mitt 9-mannalag",
    season: "2026",
    accent: "#f97316",
  },
  players: [],
  matches: [
    {
      id: crypto.randomUUID(),
      teamId: "team-main",
      matchDate: new Date().toISOString().slice(0, 16),
      matchType: "league",
      opponentName: "Kommande motstånd",
      location: "Hemmaplan",
      formationKey: DEFAULT_FORMATION_KEY,
      status: "draft",
      lineupSlots: createLineupSlots(DEFAULT_FORMATION_KEY),
      benchPlayerIds: [],
      unavailablePlayerIds: [],
      playerAttributes: [],
      createdAt: new Date().toISOString(),
    },
  ],
  selectedMatchId: null,
};

function normalizePlayer(player: Player): Player {
  return {
    ...player,
    nickname: player.nickname?.trim() || undefined,
    squadStatus: player.squadStatus ?? "regular",
  };
}

function normalizeMatch(match: MatchRecord): MatchRecord {
  return {
    ...match,
    matchType: match.matchType ?? "league",
    benchPlayerIds: match.benchPlayerIds ?? [],
    unavailablePlayerIds: match.unavailablePlayerIds ?? [],
    goalScorers: match.goalScorers ?? [],
    playerAttributes: match.playerAttributes ?? [],
  };
}

function normalizeState(state: TeamAppState): TeamAppState {
  const players = (state.players ?? []).map(normalizePlayer);
  const matches = (state.matches ?? []).map(normalizeMatch);

  const selectedMatchId =
    state.selectedMatchId && matches.some((match) => match.id === state.selectedMatchId)
      ? state.selectedMatchId
      : matches[0]?.id ?? defaultTeamState.matches[0]?.id ?? null;

  return {
    ...defaultTeamState,
    ...state,
    players,
    matches,
    selectedMatchId,
  };
}

export function loadAppState(): TeamAppState {
  if (typeof window === "undefined") {
    return defaultTeamState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      ...defaultTeamState,
      selectedMatchId: defaultTeamState.matches[0]?.id ?? null,
    };
  }

  try {
    return normalizeState(JSON.parse(raw) as TeamAppState);
  } catch {
    return {
      ...defaultTeamState,
      selectedMatchId: defaultTeamState.matches[0]?.id ?? null,
    };
  }
}

export function saveAppState(state: TeamAppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const defaultAiAnalysisSettings: AiAnalysisSettings = {
  endpoint: "",
  deployment: "",
  apiKey: "",
  selectedMatchIds: [],
  question:
    "Analysera de valda matcherna och ge konkreta förslag på formation, roller, styrkor, svagheter och nästa fokus i träning.",
};

export function loadAiAnalysisSettings(): AiAnalysisSettings {
  if (typeof window === "undefined") {
    return defaultAiAnalysisSettings;
  }

  const raw = window.localStorage.getItem(AI_STORAGE_KEY);
  if (!raw) {
    return defaultAiAnalysisSettings;
  }

  try {
    return {
      ...defaultAiAnalysisSettings,
      ...(JSON.parse(raw) as Partial<AiAnalysisSettings>),
    };
  } catch {
    return defaultAiAnalysisSettings;
  }
}

export function saveAiAnalysisSettings(settings: AiAnalysisSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(settings));
}
