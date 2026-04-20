"use client";

import clsx from "clsx";

import { Player } from "@/lib/types";

type PlayerCardProps = {
  player?: Player;
  positionLabel: string;
  className?: string;
  variant?: "field" | "story" | "compact" | "face";
  isEmpty?: boolean;
  onDoubleClick?: () => void;
  enableZoom?: boolean;
  showFullImage?: boolean;
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
    case "face":
      return {
        shell: "h-[118px] w-[118px]",
        portrait: "h-[118px]",
        number: "text-[28px]",
        position: "text-[11px]",
        name: "text-[18px]",
        firstName: "text-[10px]",
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
  onDoubleClick,
  enableZoom = true,
  showFullImage = false,
}: PlayerCardProps) {
  const styles = getVariantClasses(variant);
  const isCardEmpty = isEmpty || !player;
  const initials = `${player?.firstName?.[0] ?? "?"}${player?.lastName?.[0] ?? ""}`.toUpperCase();
  const firstNameLabel = player ? `${player.firstName[0].toUpperCase()}.` : "Ledig plats";
  const portraitFrameClass = showFullImage
    ? "top-[54px] h-[162px] rounded-[24px] bg-[linear-gradient(180deg,rgba(10,23,64,0.98),rgba(3,9,27,0.98))]"
    : "top-[62px]";
  const portraitImageClass = showFullImage
    ? "object-contain object-center scale-[1.02]"
    : "object-cover object-top";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[28px] shadow-[0_18px_46px_rgba(2,10,35,0.28)] cursor-pointer",
        isCardEmpty ? "border-dashed border-white/30" : "border border-white/10",
        styles.shell,
        className,
      )}
      onDoubleClick={onDoubleClick}
    >
      {variant === "face" ? (
        // Face-only variant with FIFA-style card frame
        <div
          className={clsx(
            "relative h-full w-full overflow-hidden rounded-[28px] border-[1.5px] border-yellow-400/80 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900",
            enableZoom && "transition-transform duration-300 hover:scale-110",
          )}
        >
          <div className="absolute inset-x-4 top-3 h-3 rounded-full bg-gradient-to-r from-yellow-400/90 via-amber-300/70 to-yellow-400/90 opacity-90 shadow-[0_0_20px_rgba(252,211,77,0.25)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_25%)] opacity-40 pointer-events-none" />

          {player?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.image}
              alt={`${player.firstName} ${player.lastName}`}
              className={clsx(
                "h-full w-full transition-transform duration-300",
                "object-cover object-[center_18%] scale-[1.55]",
                enableZoom && "hover:scale-125"
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),rgba(22,47,117,0.65)_55%,rgba(6,20,70,0.96)_100%)] text-5xl font-black text-[#f7e09b]">
              {initials}
            </div>
          )}
        </div>
      ) : (
        // Full card variant
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#071b4f_0%,#081f68_18%,#0b2a9b_45%,#040a2e_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%)] opacity-70" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_12%,transparent_65%,rgba(0,0,0,0.24))]" />

          <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2 rounded-[18px] bg-white/15 px-3 py-1.5 text-white/95 backdrop-blur-sm shadow-[0_6px_20px_rgba(0,0,0,0.16)]">
            <span className={clsx("font-black uppercase tracking-[0.26em]", styles.position)}>{positionLabel}</span>
            <span className={clsx("font-black", styles.number)}>{player?.number ?? "--"}</span>
          </div>

          <div
            className={clsx(
              "absolute inset-x-3 z-10 overflow-hidden border border-white/10",
              portraitFrameClass,
              enableZoom && "transition-transform duration-300 hover:scale-110",
              styles.portrait,
            )}
          >
            {player?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.image}
                alt={`${player.firstName} ${player.lastName}`}
                className={clsx(
                  "h-full w-full transition-transform duration-300",
                  portraitImageClass,
                  enableZoom && !showFullImage && "hover:scale-125"
                )}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),rgba(22,47,117,0.65)_55%,rgba(6,20,70,0.96)_100%)] text-5xl font-black text-[#f7e09b]">
                {initials}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(7,16,54,0.94))]" />
          </div>

          <div className="absolute inset-x-3 bottom-3 text-center text-white">
            <p className={clsx("uppercase tracking-[0.26em] text-white/70", styles.firstName)}>
              {firstNameLabel}
            </p>
            <p className={clsx("mt-1 font-black uppercase leading-none", styles.name)}>
              {player?.lastName ?? "Tom plats"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
