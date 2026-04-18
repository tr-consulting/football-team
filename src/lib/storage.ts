import { DEFAULT_FORMATION_KEY, createLineupSlots } from "@/lib/formations";
import { TeamAppState } from "@/lib/types";

const STORAGE_KEY = "football-team-manager-state";

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
      opponentName: "Kommande motstånd",
      location: "Hemmaplan",
      formationKey: DEFAULT_FORMATION_KEY,
      status: "draft",
      lineupSlots: createLineupSlots(DEFAULT_FORMATION_KEY),
      benchPlayerIds: [],
      unavailablePlayerIds: [],
      createdAt: new Date().toISOString(),
    },
  ],
  selectedMatchId: null,
};

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
    const parsed = JSON.parse(raw) as TeamAppState;
    return {
      ...defaultTeamState,
      ...parsed,
      selectedMatchId:
        parsed.selectedMatchId ?? parsed.matches[0]?.id ?? defaultTeamState.matches[0].id,
    };
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
