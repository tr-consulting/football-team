import type { User } from "@supabase/supabase-js";

import { createLineupSlots, DEFAULT_FORMATION_KEY } from "@/lib/formations";
import { defaultTeamState } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  LineupSlot,
  MatchGoalScorer,
  MatchPlayerAttributes,
  MatchRecord,
  MatchType,
  Player,
  PlayerSquadStatus,
  PlayerTrait,
  Team,
  TeamAppState,
} from "@/lib/types";

type TeamRow = {
  id: string;
  owner_user_id: string;
  name: string;
  season: string;
  accent: string;
  selected_match_id: string | null;
  created_at: string;
};

type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  nickname?: string | null;
  number: string;
  squad_status?: PlayerSquadStatus | null;
  image_path: string | null;
  small_card_crop_area: any;
  yellow_cards?: number | null;
  red_cards?: number | null;
  traits?: PlayerTrait[] | null;
  created_at: string;
};

type MatchRow = {
  id: string;
  team_id: string;
  match_date: string;
  match_type?: MatchType | null;
  opponent_name: string;
  location: string;
  formation_key: string;
  status: "draft" | "ready";
  home_score: number | null;
  away_score: number | null;
  created_at: string;
};

type SlotRow = {
  match_id: string;
  slot_key: string;
  position_label: string;
  x: number;
  y: number;
  manual_offset_x: number;
  manual_offset_y: number;
  player_id: string | null;
};

type MatchPlayerRow = {
  match_id: string;
  player_id: string;
};

type MatchGoalScorerRow = {
  match_id: string;
  player_id: string;
  goals: number;
};

type MatchPlayerAttributesRow = {
  match_id: string;
  player_id: string;
  yellow_cards: number | null;
  red_cards: number | null;
  traits: PlayerTrait[] | null;
  comment: string | null;
};

function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return (
    message.includes(`column ${columnName} does not exist`) ||
    message.includes(`Could not find the '${columnName.split(".").pop()}' column`) ||
    message.includes(`Could not find the '${columnName}' column`)
  );
}

function isMissingPlayerProfileColumn(error: unknown) {
  return (
    isMissingColumnError(error, "players.squad_status") ||
    isMissingColumnError(error, "players.nickname") ||
    isMissingColumnError(error, "players.small_card_crop_area") ||
    isMissingColumnError(error, "players.yellow_cards") ||
    isMissingColumnError(error, "players.red_cards") ||
    isMissingColumnError(error, "players.traits")
  );
}

function isMissingMatchTypeColumn(error: unknown) {
  return isMissingColumnError(error, "matches.match_type");
}

function isMissingMatchPlayerAttributesTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return (
    message.includes("Could not find the table 'public.match_player_attributes' in the schema cache") ||
    message.includes("Could not find the table 'match_player_attributes' in the schema cache") ||
    message.includes("relation \"public.match_player_attributes\" does not exist") ||
    message.includes("relation \"match_player_attributes\" does not exist")
  );
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase är inte konfigurerat.");
  }

  return supabase;
}

function createInitialMatch(teamId: string): MatchRecord {
  return {
    id: crypto.randomUUID(),
    teamId,
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
  };
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    season: row.season,
    accent: row.accent,
  };
}

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname?.trim() || undefined,
    number: row.number,
    squadStatus: row.squad_status ?? "regular",
    image: row.image_path ?? undefined,
    smallCardCropArea: row.small_card_crop_area,
    yellowCards: row.yellow_cards ?? 0,
    redCards: row.red_cards ?? 0,
    traits: row.traits ?? [],
    createdAt: row.created_at,
  };
}

function mapSlot(row: SlotRow): LineupSlot {
  return {
    slotKey: row.slot_key,
    positionLabel: row.position_label,
    x: Number(row.x),
    y: Number(row.y),
    manualOffsetX: Number(row.manual_offset_x),
    manualOffsetY: Number(row.manual_offset_y),
    playerId: row.player_id,
  };
}

function mapMatch(
  row: MatchRow,
  slots: SlotRow[],
  benchRows: MatchPlayerRow[],
  unavailableRows: MatchPlayerRow[],
  scorerRows: MatchGoalScorerRow[],
  attributeRows: MatchPlayerAttributesRow[],
): MatchRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    matchDate: row.match_date,
    matchType: row.match_type ?? "league",
    opponentName: row.opponent_name,
    location: row.location,
    formationKey: row.formation_key,
    status: row.status,
    lineupSlots:
      slots
        .filter((slot) => slot.match_id === row.id)
        .map(mapSlot) || createLineupSlots(row.formation_key),
    benchPlayerIds: benchRows
      .filter((benchRow) => benchRow.match_id === row.id)
      .map((benchRow) => benchRow.player_id),
    unavailablePlayerIds: unavailableRows
      .filter((entry) => entry.match_id === row.id)
      .map((entry) => entry.player_id),
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    goalScorers: scorerRows
      .filter((entry) => entry.match_id === row.id)
      .map(
        (entry): MatchGoalScorer => ({
          playerId: entry.player_id,
          goals: Number(entry.goals),
        }),
      ),
    playerAttributes: attributeRows
      .filter((entry) => entry.match_id === row.id)
      .map(
        (entry): MatchPlayerAttributes => ({
          playerId: entry.player_id,
          yellowCards: entry.yellow_cards ?? 0,
          redCards: entry.red_cards ?? 0,
          traits: entry.traits ?? [],
          comment: entry.comment ?? "",
        }),
      ),
    createdAt: row.created_at,
  };
}

async function ensureLeaderTeam(user: User): Promise<TeamRow> {
  const client = assertSupabase();
  const { data: existingTeam, error: existingTeamError } = await client
    .from("teams")
    .select("id, owner_user_id, name, season, accent, selected_match_id, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingTeamError) {
    throw existingTeamError;
  }

  if (existingTeam) {
    return existingTeam as TeamRow;
  }

  const { data: createdTeam, error: createError } = await client
    .from("teams")
    .insert({
      owner_user_id: user.id,
      name: defaultTeamState.team.name,
      season: defaultTeamState.team.season,
      accent: defaultTeamState.team.accent,
      selected_match_id: null,
    })
    .select("id, owner_user_id, name, season, accent, selected_match_id, created_at")
    .single();

  if (createError) {
    throw createError;
  }

  return createdTeam as TeamRow;
}

export async function getSupabaseSessionUser() {
  const client = assertSupabase();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}

export function subscribeToSupabaseAuth(callback: (user: User | null) => void) {
  const client = assertSupabase();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}

export async function signInLeader(email: string) {
  const client = assertSupabase();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
  });

  if (error) {
    throw error;
  }
}

export async function verifyLeaderOtp(email: string, token: string) {
  const client = assertSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Kunde inte verifiera engångskoden.");
  }

  return data.user;
}

export async function signOutLeader() {
  const client = assertSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function uploadPlayerImage(userId: string, playerId: string, file: File) {
  const client = assertSupabase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${playerId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await client.storage
    .from("player-images")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from("player-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function loadRemoteTeamState(user: User): Promise<TeamAppState> {
  const client = assertSupabase();
  const teamRow = await ensureLeaderTeam(user);
  const team = mapTeam(teamRow);

  const playersWithCropQuery = client
    .from("players")
    .select(
      "id, team_id, first_name, last_name, nickname, number, squad_status, image_path, small_card_crop_area, yellow_cards, red_cards, traits, created_at",
    )
    .eq("team_id", team.id);

  let playersData: unknown[] | null = null;
  let playersError: unknown = null;

  const playersWithCropResult = await playersWithCropQuery.order("created_at", { ascending: true });
  if (playersWithCropResult.error && isMissingPlayerProfileColumn(playersWithCropResult.error)) {
    const fallbackPlayersResult = await client
      .from("players")
      .select("id, team_id, first_name, last_name, number, image_path, created_at")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true });

    playersData = fallbackPlayersResult.data as unknown[] | null;
    playersError = fallbackPlayersResult.error;
  } else {
    playersData = playersWithCropResult.data as unknown[] | null;
    playersError = playersWithCropResult.error;
  }

  if (playersError) {
    throw playersError;
  }

  const matchesWithTypeResult = await client
    .from("matches")
    .select(
      "id, team_id, match_date, match_type, opponent_name, location, formation_key, status, home_score, away_score, created_at",
    )
    .eq("team_id", team.id)
    .order("match_date", { ascending: true });

  let matchesData = matchesWithTypeResult.data as MatchRow[] | null;
  let matchesError: unknown = matchesWithTypeResult.error;

  if (matchesWithTypeResult.error && isMissingMatchTypeColumn(matchesWithTypeResult.error)) {
    const fallbackMatchesResult = await client
      .from("matches")
      .select(
        "id, team_id, match_date, opponent_name, location, formation_key, status, home_score, away_score, created_at",
      )
      .eq("team_id", team.id)
      .order("match_date", { ascending: true });

    matchesData = (fallbackMatchesResult.data ?? []).map((match) => ({
      ...(match as Omit<MatchRow, "match_type">),
      match_type: "league" as MatchType,
    }));
    matchesError = fallbackMatchesResult.error;
  }

  if (matchesError) {
    throw matchesError;
  }

  const matchIds = (matchesData ?? []).map((match) => match.id);

  const [slotsResult, benchResult, unavailableResult, scorersResult, attributesResult] = await Promise.all([
    matchIds.length
      ? client
          .from("match_lineup_slots")
          .select(
            "match_id, slot_key, position_label, x, y, manual_offset_x, manual_offset_y, player_id",
          )
          .in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? client
          .from("match_bench_players")
          .select("match_id, player_id")
          .in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? client
          .from("match_unavailable_players")
          .select("match_id, player_id")
          .in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? client
          .from("match_goal_scorers")
          .select("match_id, player_id, goals")
          .in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? client
          .from("match_player_attributes")
          .select("match_id, player_id, yellow_cards, red_cards, traits, comment")
          .in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (slotsResult.error) {
    throw slotsResult.error;
  }

  if (benchResult.error) {
    throw benchResult.error;
  }

  if (unavailableResult.error) {
    throw unavailableResult.error;
  }

  if (scorersResult.error) {
    throw scorersResult.error;
  }

  if (attributesResult.error && !isMissingMatchPlayerAttributesTable(attributesResult.error)) {
    throw attributesResult.error;
  }

  const players = (playersData ?? []).map((row) => mapPlayer(row as PlayerRow));
  const matches = (matchesData ?? []).map((row) =>
    mapMatch(
      row as MatchRow,
      (slotsResult.data ?? []) as SlotRow[],
      (benchResult.data ?? []) as MatchPlayerRow[],
      (unavailableResult.data ?? []) as MatchPlayerRow[],
      (scorersResult.data ?? []) as MatchGoalScorerRow[],
      (attributesResult.data ?? []) as MatchPlayerAttributesRow[],
    ),
  );

  if (matches.length === 0) {
    const initialMatch = createInitialMatch(team.id);
    return {
      team,
      players,
      matches: [initialMatch],
      selectedMatchId: initialMatch.id,
    };
  }

  const selectedMatchId =
    (teamRow.selected_match_id && matches.some((match) => match.id === teamRow.selected_match_id))
      ? teamRow.selected_match_id
      : matches[0]?.id ?? null;

  return {
    team,
    players,
    matches,
    selectedMatchId,
  };
}

export async function persistRemoteTeamState(state: TeamAppState) {
  const client = assertSupabase();

  if (state.players.length > 0) {
    const playerRows = state.players.map((player) => ({
      id: player.id,
      team_id: state.team.id,
      first_name: player.firstName,
      last_name: player.lastName,
      nickname: player.nickname?.trim() || null,
      number: player.number,
      squad_status: player.squadStatus ?? "regular",
      image_path: player.image ?? null,
      small_card_crop_area: player.smallCardCropArea,
      yellow_cards: player.yellowCards ?? 0,
      red_cards: player.redCards ?? 0,
      traits: player.traits ?? [],
      created_at: player.createdAt,
    }));

    const { error: playerUpsertError } = await client.from("players").upsert(playerRows);

    if (playerUpsertError && isMissingPlayerProfileColumn(playerUpsertError)) {
      const fallbackRows = state.players.map((player) => ({
        id: player.id,
        team_id: state.team.id,
        first_name: player.firstName,
        last_name: player.lastName,
        number: player.number,
        image_path: player.image ?? null,
        created_at: player.createdAt,
      }));

      const { error: fallbackPlayerUpsertError } = await client.from("players").upsert(fallbackRows);

      if (fallbackPlayerUpsertError) {
        throw fallbackPlayerUpsertError;
      }
    } else if (playerUpsertError) {
      throw playerUpsertError;
    }
  }

  const { data: existingPlayers, error: existingPlayersError } = await client
    .from("players")
    .select("id")
    .eq("team_id", state.team.id);

  if (existingPlayersError) {
    throw existingPlayersError;
  }

  const playerIds = new Set(state.players.map((player) => player.id));
  const playerIdsToDelete =
    existingPlayers?.map((player) => player.id).filter((id) => !playerIds.has(id)) ?? [];

  if (playerIdsToDelete.length > 0) {
    const { error: deletePlayersError } = await client
      .from("players")
      .delete()
      .in("id", playerIdsToDelete);

    if (deletePlayersError) {
      throw deletePlayersError;
    }
  }

  if (state.matches.length > 0) {
    const { error: matchUpsertError } = await client.from("matches").upsert(
      state.matches.map((match) => ({
        id: match.id,
        team_id: state.team.id,
        match_date: match.matchDate,
        match_type: match.matchType ?? "league",
        opponent_name: match.opponentName,
        location: match.location,
        formation_key: match.formationKey,
        status: match.status,
        home_score: match.homeScore ?? null,
        away_score: match.awayScore ?? null,
        created_at: match.createdAt,
      })),
    );

    if (matchUpsertError && isMissingMatchTypeColumn(matchUpsertError)) {
      const { error: fallbackMatchUpsertError } = await client.from("matches").upsert(
        state.matches.map((match) => ({
          id: match.id,
          team_id: state.team.id,
          match_date: match.matchDate,
          opponent_name: match.opponentName,
          location: match.location,
          formation_key: match.formationKey,
          status: match.status,
          home_score: match.homeScore ?? null,
          away_score: match.awayScore ?? null,
          created_at: match.createdAt,
        })),
      );

      if (fallbackMatchUpsertError) {
        throw fallbackMatchUpsertError;
      }
    } else if (matchUpsertError) {
      throw matchUpsertError;
    }
  }

  const { data: existingMatches, error: existingMatchesError } = await client
    .from("matches")
    .select("id")
    .eq("team_id", state.team.id);

  if (existingMatchesError) {
    throw existingMatchesError;
  }

  const matchIds = new Set(state.matches.map((match) => match.id));
  const matchIdsToDelete =
    existingMatches?.map((match) => match.id).filter((id) => !matchIds.has(id)) ?? [];

  if (matchIdsToDelete.length > 0) {
    const { error: deleteMatchesError } = await client
      .from("matches")
      .delete()
      .in("id", matchIdsToDelete);

    if (deleteMatchesError) {
      throw deleteMatchesError;
    }
  }

  const currentMatchIds = state.matches.map((match) => match.id);

  if (currentMatchIds.length === 0) {
    const { error: teamError } = await client
      .from("teams")
      .update({
        name: state.team.name,
        season: state.team.season,
        accent: state.team.accent,
        selected_match_id: null,
      })
      .eq("id", state.team.id);

    if (teamError) {
      throw teamError;
    }

    return;
  }

  const [deleteSlots, deleteBench, deleteUnavailable, deleteScorers, deleteAttributes] = await Promise.all([
    client.from("match_lineup_slots").delete().in("match_id", currentMatchIds),
    client.from("match_bench_players").delete().in("match_id", currentMatchIds),
    client.from("match_unavailable_players").delete().in("match_id", currentMatchIds),
    client.from("match_goal_scorers").delete().in("match_id", currentMatchIds),
    client.from("match_player_attributes").delete().in("match_id", currentMatchIds),
  ]);

  if (deleteSlots.error) {
    throw deleteSlots.error;
  }

  if (deleteBench.error) {
    throw deleteBench.error;
  }

  if (deleteUnavailable.error) {
    throw deleteUnavailable.error;
  }

  if (deleteScorers.error) {
    throw deleteScorers.error;
  }

  if (deleteAttributes.error && !isMissingMatchPlayerAttributesTable(deleteAttributes.error)) {
    throw deleteAttributes.error;
  }

  const lineupRows = state.matches.flatMap((match) =>
    match.lineupSlots.map((slot) => ({
      match_id: match.id,
      slot_key: slot.slotKey,
      position_label: slot.positionLabel,
      x: slot.x,
      y: slot.y,
      manual_offset_x: slot.manualOffsetX,
      manual_offset_y: slot.manualOffsetY,
      player_id: slot.playerId,
    })),
  );

  if (lineupRows.length > 0) {
    const { error: insertSlotsError } = await client
      .from("match_lineup_slots")
      .insert(lineupRows);

    if (insertSlotsError) {
      throw insertSlotsError;
    }
  }

  const benchRows = state.matches.flatMap((match) =>
    match.benchPlayerIds.map((playerId) => ({
      match_id: match.id,
      player_id: playerId,
    })),
  );

  if (benchRows.length > 0) {
    const { error: insertBenchError } = await client
      .from("match_bench_players")
      .insert(benchRows);

    if (insertBenchError) {
      throw insertBenchError;
    }
  }

  const unavailableRows = state.matches.flatMap((match) =>
    match.unavailablePlayerIds.map((playerId) => ({
      match_id: match.id,
      player_id: playerId,
    })),
  );

  if (unavailableRows.length > 0) {
    const { error: insertUnavailableError } = await client
      .from("match_unavailable_players")
      .insert(unavailableRows);

    if (insertUnavailableError) {
      throw insertUnavailableError;
    }
  }

  const scorerRows = state.matches.flatMap((match) =>
    (match.goalScorers ?? []).map((scorer) => ({
      match_id: match.id,
      player_id: scorer.playerId,
      goals: scorer.goals,
    })),
  );

  if (scorerRows.length > 0) {
    const { error: insertScorersError } = await client
      .from("match_goal_scorers")
      .insert(scorerRows);

    if (insertScorersError) {
      throw insertScorersError;
    }
  }

  const attributeRows = state.matches.flatMap((match) =>
    (match.playerAttributes ?? []).map((entry) => ({
      match_id: match.id,
      player_id: entry.playerId,
      yellow_cards: entry.yellowCards ?? 0,
      red_cards: entry.redCards ?? 0,
      traits: entry.traits ?? [],
      comment: entry.comment?.trim() ?? "",
    })),
  );

  if (attributeRows.length > 0) {
    const { error: insertAttributesError } = await client
      .from("match_player_attributes")
      .insert(attributeRows);

    if (insertAttributesError && !isMissingMatchPlayerAttributesTable(insertAttributesError)) {
      throw insertAttributesError;
    }
  }

  const selectedMatchId =
    state.selectedMatchId && currentMatchIds.includes(state.selectedMatchId)
      ? state.selectedMatchId
      : currentMatchIds[0] ?? null;

  const { error: teamError } = await client
    .from("teams")
    .update({
      name: state.team.name,
      season: state.team.season,
      accent: state.team.accent,
      selected_match_id: selectedMatchId,
    })
    .eq("id", state.team.id);

  if (teamError) {
    throw teamError;
  }
}
