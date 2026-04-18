import { PlayerCard } from "@/components/player-card";
import { LineupSlot, MatchRecord, Player, Team } from "@/lib/types";

type ExportStoryProps = {
  team: Team;
  match: MatchRecord;
  starters: LineupSlot[];
  bench: Player[];
  unavailable: Player[];
  getPlayer: (playerId: string | null) => Player | undefined;
};

function getDepthScale(y: number) {
  return 0.64 + y / 340;
}

export function ExportStory({
  team,
  match,
  starters,
  bench,
  unavailable,
  getPlayer,
}: ExportStoryProps) {
  const formationLabel = match.formationKey.toUpperCase();

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-[42px] bg-[linear-gradient(180deg,#07111e_0%,#0d1930_34%,#091422_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(82,163,255,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_24%)]" />

      <div className="relative flex w-[28%] flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(5,11,22,0.94),rgba(6,14,26,0.82))] px-8 py-8">
        <p className="text-[14px] font-semibold uppercase tracking-[0.35em] text-[#f5dfa0]">
          Matchkort
        </p>
        <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-[0.08em]">
          START 9
        </h1>
        <p className="mt-4 text-lg text-white/60">
          {team.name} • {team.season}
        </p>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_24px_54px_rgba(3,7,18,0.36)]">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#f5dfa0]/72">
            Matchdetaljer
          </p>
          <p className="mt-3 text-3xl font-black uppercase tracking-[0.08em]">
            {match.opponentName}
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-white/50">
            {match.location}
          </p>
          <p className="mt-4 text-sm text-white/70">
            {new Intl.DateTimeFormat("sv-SE", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(match.matchDate))}
          </p>
          <p className="mt-4 inline-flex rounded-full border border-[#f3db95]/28 bg-[#f3db95]/14 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#f8e7ae]">
            {formationLabel}
          </p>
        </div>

        <div className="mt-7 grid gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#f5dfa0]/72">
              Avbytare
            </p>
            <div className="mt-3 space-y-2">
              {bench.length > 0 ? (
                bench.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm"
                  >
                    <span className="font-black text-[#f8e7ae]">#{player.number}</span>
                    <span className="ml-2 font-black uppercase">{player.lastName}</span>
                    <span className="ml-2 text-white/62">{player.firstName}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-4 text-white/52">
                  Ingen avbytare vald.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#f5dfa0]/72">
              Frånvarande
            </p>
            <div className="mt-3 space-y-2">
              {unavailable.length > 0 ? (
                unavailable.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-sm text-white/78"
                  >
                    #{player.number} {player.lastName}, {player.firstName}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-4 text-white/52">
                  Inga frånvarande markerade.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-8 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#f5dfa0]/72">
              Laguppställning
            </p>
            <h2 className="mt-3 text-4xl font-black uppercase tracking-[0.08em]">
              Whatsapp-export
            </h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/68">
            1080 × 1350
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#081828_0%,#0b1522_100%)] shadow-[0_28px_70px_rgba(3,7,18,0.34)]">
          <div className="absolute inset-x-[6%] bottom-[8%] top-[16%] overflow-hidden [clip-path:polygon(9%_0,91%_0,100%_100%,0_100%)] rounded-[24px] bg-[linear-gradient(180deg,#5bac31_0%,#4a9e2a_18%,#408422_100%)]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_28px,transparent_28px,transparent_56px)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.6%,rgba(255,255,255,0.6)_49.6%,rgba(255,255,255,0.6)_50.4%,transparent_50.4%)]" />
            <div className="absolute left-[11%] right-[11%] top-[9%] bottom-[9%] border-[3px] border-white/82" />
            <div className="absolute left-1/2 top-[50%] h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/82" />
            <div className="absolute left-[27%] right-[27%] top-[9%] h-[12%] border-x-[3px] border-b-[3px] border-white/82 rounded-b-[22px]" />
            <div className="absolute left-[35%] right-[35%] top-[9%] h-[4.5%] border-x-[3px] border-b-[3px] border-white/82" />
            <div className="absolute left-[27%] right-[27%] bottom-[9%] h-[12%] border-x-[3px] border-t-[3px] border-white/82 rounded-t-[22px]" />
            <div className="absolute left-[35%] right-[35%] bottom-[9%] h-[4.5%] border-x-[3px] border-t-[3px] border-white/82" />
          </div>

          {starters.map((slot) => {
            const player = getPlayer(slot.playerId);
            const scale = getDepthScale(slot.y);

            return (
              <div
                key={slot.slotKey}
                className="absolute -translate-x-1/2"
                style={{
                  left: `calc(${slot.x}% + ${slot.manualOffsetX}px)`,
                  top: `calc(${slot.y}% + ${slot.manualOffsetY}px)`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transformOrigin: "center bottom",
                  zIndex: Math.round(slot.y * 10),
                }}
              >
                <div className="absolute inset-x-8 bottom-6 h-4 rounded-full bg-black/35 blur-md" />
                <PlayerCard
                  player={player}
                  positionLabel={slot.positionLabel}
                  variant="story"
                  isEmpty={!player}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
