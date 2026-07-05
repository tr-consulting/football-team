import { FormationTemplate, LineupSlot, MatchRecord } from "@/lib/types";

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  {
    key: "3-2-3",
    label: "3-2-3",
    description: "Balanserad 9v9-grund med tre backar, två centrala mittfältare och tre forwards.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 73 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 70 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 73 },
      { slotKey: "cm-left", positionLabel: "CM", x: 36, y: 53 },
      { slotKey: "cm-right", positionLabel: "CM", x: 64, y: 53 },
      { slotKey: "lw", positionLabel: "LW", x: 24, y: 24 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 15 },
      { slotKey: "rw", positionLabel: "RW", x: 76, y: 24 },
    ],
  },
  {
    key: "3-3-2",
    label: "3-3-2",
    description: "Solid och tydlig struktur med tre backar, tre mittfältare och två forwards.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 72 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 68 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 72 },
      { slotKey: "lm", positionLabel: "LM", x: 22, y: 48 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 51 },
      { slotKey: "rm", positionLabel: "RM", x: 78, y: 48 },
      { slotKey: "st-left", positionLabel: "ST", x: 38, y: 14 },
      { slotKey: "st-right", positionLabel: "ST", x: 62, y: 14 },
    ],
  },
  {
    key: "3-1-3-1",
    label: "3-1-3-1",
    description: "Kreativ formation med en defensiv mittfältare som säkrar bakom offensiva trean.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 72 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 68 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 72 },
      { slotKey: "dm", positionLabel: "DM", x: 50, y: 55 },
      { slotKey: "lw", positionLabel: "LW", x: 24, y: 32 },
      { slotKey: "am", positionLabel: "AM", x: 50, y: 34 },
      { slotKey: "rw", positionLabel: "RW", x: 76, y: 32 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 13 },
    ],
  },
  {
    key: "3-4-1",
    label: "3-4-1",
    description: "Stabil formation där breda mittfältare kan göra den mer offensiv i anfall.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "lb", positionLabel: "LB", x: 20, y: 72 },
      { slotKey: "cb", positionLabel: "CB", x: 50, y: 68 },
      { slotKey: "rb", positionLabel: "RB", x: 80, y: 72 },
      { slotKey: "lm", positionLabel: "LM", x: 16, y: 47 },
      { slotKey: "cm-left", positionLabel: "CM", x: 39, y: 50 },
      { slotKey: "cm-right", positionLabel: "CM", x: 61, y: 50 },
      { slotKey: "rm", positionLabel: "RM", x: 84, y: 47 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 13 },
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
    key: "2-3-3",
    label: "2-3-3",
    description: "Hög press med tre forwards, tre mittfältare och två säkrande backar.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "cb-left", positionLabel: "CB", x: 34, y: 70 },
      { slotKey: "cb-right", positionLabel: "CB", x: 66, y: 70 },
      { slotKey: "lm", positionLabel: "LM", x: 22, y: 47 },
      { slotKey: "cm", positionLabel: "CM", x: 50, y: 50 },
      { slotKey: "rm", positionLabel: "RM", x: 78, y: 47 },
      { slotKey: "lw", positionLabel: "LW", x: 22, y: 22 },
      { slotKey: "st", positionLabel: "ST", x: 50, y: 14 },
      { slotKey: "rw", positionLabel: "RW", x: 78, y: 22 },
    ],
  },
  {
    key: "2-4-2",
    label: "2-4-2",
    description: "Mittfältsstark formation som lär både mittbackar och anfallare att jobba i par.",
    slots: [
      { slotKey: "gk", positionLabel: "GK", x: 50, y: 91 },
      { slotKey: "cb-left", positionLabel: "CB", x: 35, y: 73 },
      { slotKey: "cb-right", positionLabel: "CB", x: 65, y: 73 },
      { slotKey: "lm", positionLabel: "LM", x: 16, y: 48 },
      { slotKey: "cm-left", positionLabel: "CM", x: 39, y: 51 },
      { slotKey: "cm-right", positionLabel: "CM", x: 61, y: 51 },
      { slotKey: "rm", positionLabel: "RM", x: 84, y: 48 },
      { slotKey: "st-left", positionLabel: "ST", x: 38, y: 14 },
      { slotKey: "st-right", positionLabel: "ST", x: 62, y: 14 },
    ],
  },
  {
    key: "2-3-2-1",
    label: "2-3-2-1",
    description: "Variant av 2-3-3 med två offensiva mittfältare bakom en ensam nia.",
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
];

const LEGACY_FORMATION_TEMPLATES: FormationTemplate[] = [
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
  {
    key: "3-2-2-1",
    label: "3-2-2-1",
    description: "Äldre mall som behålls för sparade matcher.",
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
    key: "3-3-1",
    label: "3-3-1-1",
    description: "Äldre felmärkt mall som visas numeriskt korrekt för sparade matcher.",
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
];

export const DEFAULT_FORMATION_KEY = FORMATION_TEMPLATES[0].key;

export function getFormationTemplate(formationKey: string) {
  return (
    [...FORMATION_TEMPLATES, ...LEGACY_FORMATION_TEMPLATES].find(
      (formation) => formation.key === formationKey,
    ) ??
    FORMATION_TEMPLATES[0]
  );
}

export function getFormationLabel(formationKey: string) {
  return getFormationTemplate(formationKey).label;
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
