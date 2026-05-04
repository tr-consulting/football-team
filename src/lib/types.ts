export type MatchStatus = "draft" | "ready";

export type MatchType = "league" | "friendly" | "cup";

export type PlayerSquadStatus = "regular" | "borrowed";

export type MatchGoalScorer = {
  playerId: string;
  goals: number;
};

export type MatchPlayerAttributes = {
  playerId: string;
  yellowCards?: number;
  redCards?: number;
  traits?: PlayerTrait[];
  comment?: string;
};

export type PlayerTrait =
  | "Peppande"
  | "Utstrålar glädje"
  | "Ledare"
  | "Lugn under press"
  | "Kommunikativ"
  | "Vinnarskalle";

export type Player = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  number: string;
  squadStatus?: PlayerSquadStatus;
  image?: string;
  smallCardCropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth?: number;
    imageHeight?: number;
  };
  smallCardShowName?: boolean;
  smallCardShowPosition?: boolean;
  smallCardShowNumber?: boolean;
  largeCardImageFocus?: "full" | "torso" | "face";
  yellowCards?: number;
  redCards?: number;
  traits?: PlayerTrait[];
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
  matchType: MatchType;
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
  playerAttributes?: MatchPlayerAttributes[];
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

export type AiAnalysisSettings = {
  endpoint: string;
  deployment: string;
  apiKey: string;
  selectedMatchIds: string[];
  question: string;
};
