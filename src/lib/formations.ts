import { FormationTemplate, LineupSlot, MatchRecord } from "@/lib/types";

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  {
    key: "3-2-2-1",
    label: "3-2-2-1",
    description: "Balans mellan trebackslinje och två kreativa tia-liknande ytor.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 73 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 70 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 73 },
      { slotKey: "cm-left", positionLabel: "CM", x: 36, y: 53 },
      { slotKey: "cm-right", positionLabel: "CM", x: 64, y: 53 },
      { slotKey: "am-left", positionLabel: "LW", x: 30, y: 34 },
      { slotKey: "am-right", positionLabel: "RW", x: 70, y: 34 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 15 },
    ],
  },
  {
    key: "3-3-1-1",
    label: "3-3-1-1",
    description: "Tydlig diamantkänsla med ett nav bakom toppspelaren.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 72 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 69 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 72 },
      { slotKey: "lm", positionLabel: "LM", x: 25, y: 47 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 51 },
      { slotKey: "rm", positionLabel: "RM", x: 75, y: 47 },
      { slotKey: "cam", positionLabel: "CAM", x: 50, y: 31 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 14 },
    ],
  },
  {
    key: "2-3-2-1",
    label: "2-3-2-1",
    description: "Mer offensiv bredd med högre wingbacks och två mittbackar.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "cb-left", positionLabel: "CB", x: 33, y: 73 },
      { slotKey: "cb-right", positionLabel: "CB", x: 67, y: 73 },
      { slotKey: "lm", positionLabel: "LM", x: 18, y: 52 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 53 },
      { slotKey: "rm", positionLabel: "RM", x: 82, y: 52 },
      { slotKey: "lw", positionLabel: "LW", x: 31, y: 30 },
      { slotKey: "rw", positionLabel: "RW", x: 69, y: 30 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 12 },
    ],
  },
  {
    key: "3-1-3-1",
    label: "3-1-3-1",
    description: "Ett sittande ankare och tre höga offensiva mittfältare.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 73 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 69 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 73 },
      { slotKey: "cdm", positionLabel: "CDM", x: 50, y: 56 },
      { slotKey: "lm", positionLabel: "LM", x: 22, y: 35 },
      { slotKey: "cam", positionLabel: "CAM", x: 50, y: 35 },
      { slotKey: "rm", positionLabel: "RM", x: 78, y: 35 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 13 },
    ],
  },
];

export const DEFAULT_FORMATION_KEY = FORMATION_TEMPLATES[0].key;

export function getFormationTemplate(formationKey: string) {
  return (
    FORMATION_TEMPLATES.find((formation) => formation.key === formationKey) ??
    FORMATION_TEMPLATES[0]
  );
}

export function createLineupSlots(formationKey: string): LineupSlot[] {
  return getFormationTemplate(formationKey).slots.map((slot) => ({
    ...slot,
    playerId: null,
    manualOffsetX: 0,
    manualOffsetY: 0,
  }));
}

export function remapMatchFormation(
  match: MatchRecord,
  nextFormationKey: string,
): MatchRecord {
  const nextSlots = createLineupSlots(nextFormationKey);
  const existingPlayers = match.lineupSlots
    .map((slot) => slot.playerId)
    .filter((playerId): playerId is string => Boolean(playerId));

  return {
    ...match,
    formationKey: nextFormationKey,
    lineupSlots: nextSlots.map((slot, index) => ({
      ...slot,
      playerId: existingPlayers[index] ?? null,
    })),
  };
}
