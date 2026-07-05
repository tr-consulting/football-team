import { PlayerCard } from "@/components/player-card";
import { getFormationLabel } from "@/lib/formations";
import { LineupSlot, MatchRecord, Player, Team } from "@/lib/types";

type ExportStoryProps = {
  team: Team;
  match: MatchRecord;
  starters: LineupSlot[];
  bench: Player[];
  getPlayer: (playerId: string | null) => Player | undefined;
};

const STATIC_HOME_TEAM_NAME = "Djurgården P13-5";

function getDepthScale(y: number) {
  return 1.12 + y / 560;
}

function projectPitchX(x: number, y: number) {
  const leftEdge = 11 - (11 * y) / 100;
  const width = 78 + (22 * y) / 100;

  return leftEdge + (x / 100) * width;
}

function projectPitchY(y: number) {
  return 1 + y * 0.99;
}

function pitchPoint(x: number, y: number) {
  return `${projectPitchX(x, y).toFixed(2)},${projectPitchY(y).toFixed(2)}`;
}

function getMatchTypeLabel(matchType = "league") {
  if (matchType === "friendly") {
    return "Träningsmatch";
  }

  if (matchType === "cup") {
    return "Cup";
  }

  return "Seriespel";
}

function getMatchDateParts(matchDate: string) {
  const date = new Date(matchDate);

  return {
    date: new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

export function ExportStory({
  team,
  match,
  starters,
  bench,
  getPlayer,
}: ExportStoryProps) {
  void team;
  const formationLabel = getFormationLabel(match.formationKey).toUpperCase();
  const matchDate = getMatchDateParts(match.matchDate);
  const matchMeta = [
    { label: "Datum", value: matchDate.date },
    { label: "Tid", value: matchDate.time },
    { label: "Plats", value: match.location },
    { label: "Formation", value: formationLabel },
    { label: "Matchtyp", value: getMatchTypeLabel(match.matchType) },
  ];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[42px] bg-[linear-gradient(180deg,#061222_0%,#071a2d_34%,#04101c_100%)] px-7 py-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.14),transparent_26%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="relative rounded-[34px] border border-white/10 bg-slate-950/58 px-7 py-6 shadow-[0_24px_70px_rgba(3,7,18,0.42)]">
        <div className="grid grid-cols-[minmax(0,1fr)_86px_minmax(0,1fr)] items-center gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#f6d889]/72">
              Hemmalag
            </p>
            <h1 className="mt-3 truncate text-4xl font-black uppercase tracking-[0.06em] text-white">
              {STATIC_HOME_TEAM_NAME}
            </h1>
          </div>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f6d889]/35 bg-black/24 text-xl font-black uppercase tracking-[0.16em] text-[#f6d889]">
            VS
          </div>

          <div className="min-w-0 text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#f6d889]/72">
              Motstånd
            </p>
            <h2 className="mt-3 truncate text-4xl font-black uppercase tracking-[0.06em] text-white">
              {match.opponentName}
            </h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-3 border-t border-white/10 pt-5">
          {matchMeta.map((item) => (
            <div key={item.label} className="min-w-0 border-r border-white/10 pr-3 last:border-r-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/38">
                {item.label}
              </p>
              <p className="mt-1 truncate text-[15px] font-black uppercase tracking-[0.08em] text-white/88">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </header>

      <section className="relative mt-7 text-center">
        <div className="flex items-center justify-center gap-7">
          <span className="h-px w-16 bg-[#f6d889]/74" />
          <p className="text-2xl font-black uppercase tracking-[0.5em] text-white">
            Start-nia
          </p>
          <span className="h-px w-16 bg-[#f6d889]/74" />
        </div>
        <p className="mt-2 text-5xl font-black uppercase tracking-[0.2em] text-[#f6d889]">
          {formationLabel}
        </p>
      </section>

      <section className="relative mt-4 h-[825px] overflow-hidden rounded-[30px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.2),transparent_58%)]" />
        <svg
          className="absolute inset-x-0 bottom-0 top-4 h-[calc(100%-1rem)] w-full drop-shadow-[0_30px_90px_rgba(2,6,23,0.42)]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="export-pitch-grass" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#62b944" />
              <stop offset="34%" stopColor="#46982f" />
              <stop offset="100%" stopColor="#2f761d" />
            </linearGradient>
            <pattern id="export-pitch-stripes" width="100" height="10" patternUnits="userSpaceOnUse">
              <rect width="100" height="5" fill="rgba(255,255,255,0.055)" />
            </pattern>
            <clipPath id="export-pitch-clip">
              <polygon points="11,1 89,1 100,100 0,100" />
            </clipPath>
          </defs>

          <g clipPath="url(#export-pitch-clip)">
            <polygon points="11,1 89,1 100,100 0,100" fill="url(#export-pitch-grass)" />
            <polygon points="11,1 89,1 100,100 0,100" fill="url(#export-pitch-stripes)" />
            <path d="M50 1 L50 100" stroke="rgba(255,255,255,0.62)" strokeWidth="0.42" />
          </g>

          <g fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="0.42" vectorEffect="non-scaling-stroke">
            <polygon points="11,1 89,1 100,100 0,100" />
            <polyline points={`${pitchPoint(0, 1)} ${pitchPoint(100, 1)}`} />
            <polyline points={`${pitchPoint(0, 100)} ${pitchPoint(100, 100)}`} />

            <circle cx="50" cy={projectPitchY(50)} r="10" />

            <polyline
              points={`${pitchPoint(32, 1)} ${pitchPoint(32, 13)} ${pitchPoint(68, 13)} ${pitchPoint(68, 1)}`}
            />
            <polyline
              points={`${pitchPoint(39, 1)} ${pitchPoint(39, 6)} ${pitchPoint(61, 6)} ${pitchPoint(61, 1)}`}
            />
            <polyline
              points={`${pitchPoint(32, 100)} ${pitchPoint(32, 88)} ${pitchPoint(68, 88)} ${pitchPoint(68, 100)}`}
            />
            <polyline
              points={`${pitchPoint(39, 100)} ${pitchPoint(39, 95)} ${pitchPoint(61, 95)} ${pitchPoint(61, 100)}`}
            />

            <path d={`M ${pitchPoint(0, 9)} Q ${pitchPoint(9, 9)} ${pitchPoint(9, 1)}`} />
            <path d={`M ${pitchPoint(91, 1)} Q ${pitchPoint(91, 9)} ${pitchPoint(100, 9)}`} />
            <path d={`M ${pitchPoint(0, 92)} Q ${pitchPoint(9, 92)} ${pitchPoint(9, 100)}`} />
            <path d={`M ${pitchPoint(91, 100)} Q ${pitchPoint(91, 92)} ${pitchPoint(100, 92)}`} />
          </g>
        </svg>

        {starters.map((slot) => {
          const player = getPlayer(slot.playerId);
          const scale = getDepthScale(slot.y);

          return (
            <div
              key={slot.slotKey}
              className="absolute"
              style={{
                left: `calc(${projectPitchX(slot.x, slot.y)}% + ${slot.manualOffsetX}px)`,
                top: `calc(${projectPitchY(slot.y)}% + ${slot.manualOffsetY}px)`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: "center bottom",
                zIndex: Math.round(slot.y * 10),
              }}
            >
              <div className="absolute inset-x-6 bottom-3 h-5 rounded-full bg-black/38 blur-md" />
              <PlayerCard
                player={player}
                positionLabel={slot.positionLabel}
                variant="face"
                showName={player?.smallCardShowName ?? true}
                showPosition={player?.smallCardShowPosition ?? true}
                showNumber={player?.smallCardShowNumber ?? true}
                isEmpty={!player}
              />
            </div>
          );
        })}
      </section>

      <section className="relative mt-5 rounded-[30px] border border-white/12 bg-slate-950/58 px-7 py-5 shadow-[0_22px_70px_rgba(3,7,18,0.32)]">
        <div className="mb-4 flex items-center justify-center gap-7">
          <span className="h-px w-16 bg-[#f6d889]/74" />
          <p className="text-xl font-black uppercase tracking-[0.46em] text-[#f6d889]">
            Avbytare
          </p>
          <span className="h-px w-16 bg-[#f6d889]/74" />
        </div>

        {bench.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {bench.map((player) => (
              <div
                key={player.id}
                className="min-w-0 rounded-[14px] border border-cyan-400/55 bg-[linear-gradient(135deg,rgba(3,18,34,0.94),rgba(5,29,52,0.9))] px-5 py-4 shadow-[0_12px_34px_rgba(3,7,18,0.24)]"
              >
                <p className="text-xl font-black text-[#f6d889]">#{player.number}</p>
                <p className="mt-2 truncate text-lg font-black uppercase tracking-[0.06em] text-white">
                  {player.lastName}
                </p>
                <p className="mt-1 truncate text-base text-white/72">{player.firstName}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[18px] border border-dashed border-white/14 px-5 py-5 text-center text-base text-white/56">
            Ingen avbytare vald.
          </p>
        )}
      </section>
    </div>
  );
}
