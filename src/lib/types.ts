export type MatchStatus = "draft" | "ready";

export type MatchGoalScorer = {
  playerId: string;
  goals: number;
};

export type Player = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  number: string;
  image?: string;
  createdAt: string;
};

export type Team = {
  id: string;
  name: string;
  season: string;
  accent: string;
};

export type FormationSlotTemplate = {
  slotKey: string;
  positionLabel: string;
  x: number;
  y: number;
};

export type FormationTemplate = {
  key: string;
  label: string;
  description: string;
  slots: FormationSlotTemplate[];
};

export type LineupSlot = FormationSlotTemplate & {
  playerId: string | null;
  manualOffsetX: number;
  manualOffsetY: number;
};

export type MatchRecord = {
  id: string;
  teamId: string;
  matchDate: string;
  opponentName: string;
  location: string;
  formationKey: string;
  status: MatchStatus;
  lineupSlots: LineupSlot[];
  benchPlayerIds: string[];
  unavailablePlayerIds: string[];
  homeScore?: number;
  awayScore?: number;
  goalScorers?: MatchGoalScorer[];
  createdAt: string;
};

export type MatchLineup = {
  match: MatchRecord;
  starters: LineupSlot[];
  bench: Player[];
  unavailable: Player[];
};

export type ExportLayout = {
  width: number;
  height: number;
  title: string;
};

export type TeamAppState = {
  team: Team;
  players: Player[];
  matches: MatchRecord[];
  selectedMatchId: string | null;
};
