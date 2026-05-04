import { FormationTemplate, LineupSlot, MatchRecord } from "@/lib/types";

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  {
    key: "3-2-2-1",
    label: "3-2-2-1",
    description: "Balanserad svensk 9v9-grund med tydliga linjer, bredd och en ensam nia.",
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
    key: "4-3-1",
    label: "4-3-1",
    description: "Trygg fyrbackslinje med stabilitet bakåt och en tydlig central nia.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 14, y: 68 },
      { slotKey: "cb-left", positionLabel: "CB", x: 37, y: 72 },
      { slotKey: "cb-right", positionLabel: "CB", x: 63, y: 72 },
      { slotKey: "rb", positionLabel: "RB", x: 86, y: 68 },
      { slotKey: "cm-left", positionLabel: "CM", x: 28, y: 49 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 43 },
      { slotKey: "cm-right", positionLabel: "CM", x: 72, y: 49 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 12 },
    ],
  },
  {
    key: "3-3-1",
    label: "3-3-1",
    description: "Enkel och pedagogisk struktur med tre bak, tre mitt och en topp.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 72 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 68 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 72 },
      { slotKey: "lm", positionLabel: "LM", x: 22, y: 46 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 50 },
      { slotKey: "rm", positionLabel: "RM", x: 78, y: 46 },
      { slotKey: "am", positionLabel: "AM", x: 50, y: 29 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 13 },
    ],
  },
  {
    key: "2-3-2-1",
    label: "2-3-2-1",
    description: "Teknisk och offensiv 9v9-struktur för lag som vill spela sig fram på marken.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "cb-left", positionLabel: "CB", x: 35, y: 73 },
      { slotKey: "cb-right", positionLabel: "CB", x: 65, y: 73 },
      { slotKey: "lm", positionLabel: "LM", x: 18, y: 53 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 55 },
      { slotKey: "rm", positionLabel: "RM", x: 82, y: 53 },
      { slotKey: "lw", positionLabel: "LW", x: 32, y: 31 },
      { slotKey: "rw", positionLabel: "RW", x: 68, y: 31 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 13 },
    ],
  },
  {
    key: "2-5-1",
    label: "2-5-1",
    description: "Mittfältstung lösning som kan fungera för bollskickliga lag med tydliga roller.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "cb-left", positionLabel: "CB", x: 34, y: 73 },
      { slotKey: "cb-right", positionLabel: "CB", x: 66, y: 73 },
      { slotKey: "lm", positionLabel: "LM", x: 14, y: 49 },
      { slotKey: "cm-left", positionLabel: "CM", x: 32, y: 51 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 44 },
      { slotKey: "cm-right", positionLabel: "CM", x: 68, y: 51 },
      { slotKey: "rm", positionLabel: "RM", x: 86, y: 49 },
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
