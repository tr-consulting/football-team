"use client";

import clsx from "clsx";

import { Player } from "@/lib/types";

type PlayerCardProps = {
  player?: Player;
  positionLabel: string;
  className?: string;
  variant?: "field" | "story" | "compact";
  isEmpty?: boolean;
};

function getVariantClasses(variant: NonNullable<PlayerCardProps["variant"]>) {
  switch (variant) {
    case "compact":
      return {
        shell: "h-[172px] w-[108px]",
        portrait: "h-[96px]",
        number: "text-[22px]",
        position: "text-[9px]",
        name: "text-sm",
        firstName: "text-[9px]",
      };
    case "story":
      return {
        shell: "h-[240px] w-[170px]",
        portrait: "h-[135px]",
        number: "text-[40px]",
        position: "text-[15px]",
        name: "text-[25px]",
        firstName: "text-[11px]",
      };
    default:
      return {
        shell: "h-[220px] w-[118px]",
        portrait: "h-[118px]",
        number: "text-[28px]",
        position: "text-[11px]",
        name: "text-[18px]",
        firstName: "text-[10px]",
      };
  }
}

export function PlayerCard({
  player,
  positionLabel,
  className,
  variant = "field",
  isEmpty = false,
}: PlayerCardProps) {
  const styles = getVariantClasses(variant);
  const isCardEmpty = isEmpty || !player;
  const initial = player?.firstName?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[28px] shadow-[0_18px_46px_rgba(2,10,35,0.28)]",
        isCardEmpty ? "border-dashed border-white/30" : "border border-white/10",
        styles.shell,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#071b4f_0%,#081f68_18%,#0b2a9b_45%,#040a2e_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%)] opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_12%,transparent_65%,rgba(0,0,0,0.24))]" />

      <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2 rounded-[18px] bg-white/15 px-3 py-1.5 text-white/95 backdrop-blur-sm shadow-[0_6px_20px_rgba(0,0,0,0.16)]">
        <span className={clsx("font-black uppercase tracking-[0.26em]", styles.position)}>{positionLabel}</span>
        <span className={clsx("font-black", styles.number)}>{player?.number ?? "--"}</span>
      </div>

      <div
        className={clsx(
          "absolute inset-x-3 top-[62px] z-10 overflow-hidden rounded-[22px] border border-white/10 bg-black/20",
          styles.portrait,
        )}
      >
        {player?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.image}
            alt={`${player.firstName} ${player.lastName}`}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),rgba(22,47,117,0.65)_55%,rgba(6,20,70,0.96)_100%)] text-5xl font-black text-[#f7e09b]">
            {initial}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(7,16,54,0.94))]" />
      </div>

      <div className="absolute inset-x-3 bottom-3 text-center text-white">
        <p className={clsx("uppercase tracking-[0.26em] text-white/70", styles.firstName)}>
          {player?.firstName ?? "Ledig plats"}
        </p>
        <p className={clsx("mt-1 font-black uppercase leading-none", styles.name)}>
          {player?.lastName ?? "Tom plats"}
        </p>
      </div>
    </div>
  );
}
