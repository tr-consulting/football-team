"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

import { Player } from "@/lib/types";

type PlayerCardProps = {
  player?: Player;
  positionLabel: string;
  className?: string;
  variant?: "field" | "story" | "compact" | "face";
  imageFocus?: "face" | "torso" | "full";
  showName?: boolean;
  showPosition?: boolean;
  showNumber?: boolean;
  isEmpty?: boolean;
  onDoubleClick?: () => void;
  enableZoom?: boolean;
  showFullImage?: boolean;
};

const CARD_CLIP_PATH =
  "polygon(10% 6%, 32% 1.5%, 42% 4.8%, 50% 0, 58% 4.8%, 68% 1.5%, 90% 6%, 97% 20%, 94.5% 60%, 91% 84%, 80% 97%, 50% 100%, 20% 97%, 9% 84%, 5.5% 60%, 3% 20%)";

function getVariantClasses(variant: NonNullable<PlayerCardProps["variant"]>) {
  switch (variant) {
    case "compact":
      return {
        shell: "h-[188px] w-[134px]",
        art: "top-[33px] left-[26px] right-[14px] h-[100px]",
        rating: "text-[24px]",
        position: "text-[11px]",
        name: "text-[15px]",
        meta: "text-[9px]",
      };
    case "story":
      return {
        shell: "h-[304px] w-[214px]",
        art: "top-[44px] left-[40px] right-[18px] h-[170px]",
        rating: "text-[46px]",
        position: "text-[17px]",
        name: "text-[26px]",
        meta: "text-[11px]",
      };
    case "face":
      return {
        shell: "h-[136px] w-[104px]",
        art: "top-[24px] left-[18px] right-[10px] h-[86px]",
        rating: "text-[21px]",
        position: "text-[9px]",
        name: "text-[11px]",
        meta: "text-[8px]",
      };
    default:
      return {
        shell: "h-[224px] w-[156px]",
        art: "top-[35px] left-[30px] right-[15px] h-[126px]",
        rating: "text-[30px]",
        position: "text-[12px]",
        name: "text-[17px]",
        meta: "text-[10px]",
      };
  }
}

export function PlayerCard({
  player,
  positionLabel,
  className,
  variant = "field",
  imageFocus,
  showName = true,
  showPosition = true,
  showNumber = true,
  onDoubleClick,
  enableZoom = true,
  showFullImage = false,
}: PlayerCardProps) {
  const styles = getVariantClasses(variant);
  const [hasImageError, setHasImageError] = useState(false);
  const initials = `${player?.firstName?.[0] ?? "?"}${player?.lastName?.[0] ?? ""}`.toUpperCase();
  const playerLabel = player ? `${player.firstName} ${player.lastName}` : "Ledig plats";
  const faceOnly = variant === "face";
  const storyCard = variant === "story";
  const compactCard = variant === "compact";
  const modernCard = faceOnly || storyCard || compactCard;
  const faceName = player ? `${player.firstName?.[0] ?? ""}.${player.lastName}` : "";
  const focus = imageFocus ?? (faceOnly ? "face" : "full");
  const imageObjectPosition = focus === "face" ? "center 22%" : focus === "torso" ? "center 38%" : "center 58%";
  const cropStyle = { objectPosition: imageObjectPosition };
  const faceCrop = player?.smallCardCropArea;
  const hasPreciseFaceCrop = Boolean(
    faceOnly &&
      faceCrop &&
      faceCrop.imageWidth &&
      faceCrop.imageHeight &&
      faceCrop.width > 0 &&
      faceCrop.height > 0,
  );

  const artImageClass = clsx(
    showFullImage ? "object-contain object-center" : "object-cover",
    faceOnly ? "" : "transition-transform duration-300",
  );
  const focusStyle = cropStyle;

  useEffect(() => {
    setHasImageError(false);
  }, [player?.image]);

  if (modernCard) {
    return (
      <div
        className={clsx(
          "relative overflow-hidden border-2 border-cyan-400/80 bg-slate-950 shadow-[0_24px_54px_rgba(8,42,88,0.45)]",
          storyCard ? "rounded-[32px]" : "rounded-[24px]",
          styles.shell,
          className,
        )}
        onDoubleClick={onDoubleClick}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.24),transparent_36%),linear-gradient(180deg,#020617_0%,#06112a_60%,#020617_100%)]" />
        {player?.image && !hasImageError ? (
          faceOnly && hasPreciseFaceCrop && faceCrop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.image}
              alt={playerLabel}
              className="absolute max-w-none select-none"
              onError={() => setHasImageError(true)}
              style={{
                width: `${((faceCrop.imageWidth ?? faceCrop.width) / faceCrop.width) * 100}%`,
                height: `${((faceCrop.imageHeight ?? faceCrop.height) / faceCrop.height) * 100}%`,
                left: `-${(faceCrop.x / faceCrop.width) * 100}%`,
                top: `-${(faceCrop.y / faceCrop.height) * 100}%`,
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.image}
              alt={playerLabel}
              onError={() => setHasImageError(true)}
              style={faceOnly ? cropStyle : undefined}
              className={clsx(
                "absolute inset-0 block h-full w-full transition-transform duration-300",
                storyCard
                  ? "object-contain object-center p-4"
                  : compactCard
                    ? showFullImage
                      ? "object-contain object-center p-3"
                      : "object-cover object-top"
                    : artImageClass,
                enableZoom && (storyCard || compactCard ? "hover:scale-[1.04]" : "hover:scale-[1.5]"),
              )}
            />
          )
        ) : (
          <div
            className={clsx(
              "absolute inset-0 flex h-full w-full items-center justify-center font-black text-white/90",
              storyCard
                ? "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),rgba(15,23,42,0.96)_70%)] text-7xl"
                : compactCard
                  ? "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(15,23,42,0.96)_70%)] text-5xl"
                  : "bg-slate-900 text-4xl",
            )}
          >
            {initials}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_48%,rgba(2,6,23,0.16)_68%,rgba(2,6,23,0.88)_100%)]" />

        {showNumber && player?.number ? (
          <div
            className={clsx(
              "absolute rounded-full border border-cyan-300/50 bg-slate-950/90 font-black leading-none text-white shadow-[0_6px_18px_rgba(2,6,23,0.4)] backdrop-blur-sm",
              storyCard
                ? "left-3 top-3 px-3 py-2 text-xl"
                : compactCard
                  ? "left-2 top-2 px-2.5 py-1.5 text-sm"
                  : "left-1.5 top-1.5 px-2 py-1 text-[10px]",
            )}
          >
            #{player.number}
          </div>
        ) : null}

        {storyCard ? (
          <div className="absolute inset-x-3 bottom-3 rounded-[24px] border border-white/10 bg-slate-950/88 px-4 py-4 text-white/95 backdrop-blur-md">
            {showName ? (
              <p className="text-xl font-black uppercase leading-none tracking-[0.08em] text-cyan-100">
                {player ? `${player.firstName} ${player.lastName}` : "Ledig plats"}
              </p>
            ) : null}
            {showPosition ? (
              <p className="mt-2 text-sm uppercase tracking-[0.24em] text-white/68">
                {positionLabel}
              </p>
            ) : null}
          </div>
        ) : compactCard ? (
          <div className="absolute inset-x-2 bottom-2 rounded-[18px] border border-white/10 bg-slate-950/88 px-3 py-2 text-white/95 backdrop-blur-md">
            {showName ? (
              <p className="text-[11px] font-black uppercase leading-none tracking-[0.08em] text-cyan-100">
                {player ? `${player.firstName?.[0] ?? ""}.${player.lastName}` : "LEDIG"}
              </p>
            ) : null}
            {showPosition ? (
              <p className="mt-1 text-[8px] uppercase tracking-[0.22em] text-white/68">
                {positionLabel}
              </p>
            ) : null}
          </div>
        ) : showName || (showPosition && player) ? (
          <div className="absolute inset-x-1 bottom-1 rounded-[20px] bg-slate-950/90 px-2 py-1 text-center text-white/90 backdrop-blur-sm">
            {showName ? (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                {faceName.toUpperCase()}
              </p>
            ) : null}
            {showPosition && player ? (
              <p className="mt-0.5 text-[8px] uppercase tracking-[0.18em] text-white/70">
                {positionLabel}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={clsx("relative cursor-pointer select-none", styles.shell, className)}
      onDoubleClick={onDoubleClick}
    >
      <div className="absolute inset-[6%] rounded-[50%] bg-black/35 blur-[18px]" />

      <div
        className="absolute inset-0 shadow-[0_20px_44px_rgba(15,23,42,0.34)]"
        style={{ clipPath: CARD_CLIP_PATH }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#06172f_0%,#0c2548_26%,#0b1734_70%,#03101e_100%)]" />
        <div className="absolute inset-[2px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03),rgba(0,0,0,0.16))]" />
        <div className="absolute inset-[5px] opacity-55" style={{ clipPath: CARD_CLIP_PATH }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.25),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.1),transparent_18%),linear-gradient(140deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.0)_36%),linear-gradient(45deg,rgba(24,144,255,0.05)_38%,rgba(99,165,255,0.1)_54%,rgba(255,255,255,0.0)_70%)]" />
        </div>

        <div className="absolute inset-[4px] overflow-hidden" style={{ clipPath: CARD_CLIP_PATH }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),transparent_30%),linear-gradient(180deg,#fffef8_0%,#f9efd2_24%,#ecd29a_55%,#d7ab54_100%)]" />
          <div className="absolute inset-0 opacity-50 bg-[linear-gradient(135deg,rgba(255,255,255,0.0)_16%,rgba(255,255,255,0.75)_32%,rgba(255,255,255,0.0)_44%),linear-gradient(45deg,rgba(171,117,12,0.0)_22%,rgba(171,117,12,0.2)_44%,rgba(255,255,255,0.0)_60%)]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8),transparent_18%),radial-gradient(circle_at_50%_105%,rgba(101,67,14,0.18),transparent_20%)]" />

          <div
            className={clsx(
              "absolute rounded-[22px] border border-cyan-400/40 bg-[linear-gradient(180deg,rgba(9,37,74,0.55),rgba(7,27,60,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
              styles.art,
              enableZoom && "transition-transform duration-300",
              enableZoom && !showFullImage && "hover:scale-[1.03]",
            )}
          >
            {player?.image && !hasImageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.image}
                alt={playerLabel}
                onError={() => setHasImageError(true)}
                style={focusStyle}
                className={clsx("h-full w-full transition-transform duration-300", artImageClass)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(91,122,219,0.34),rgba(16,23,71,0.96)_70%)] text-4xl font-black text-[#7c4f10]">
                {initials}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(180deg,transparent,rgba(52,34,8,0.24))]" />
          </div>

          {(showNumber || showPosition) ? (
            <div className="absolute left-[11%] top-[11%] z-20 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {showNumber ? (
                <p className={clsx("font-black leading-none", styles.rating)}>{player?.number ?? "--"}</p>
              ) : null}
              {showPosition ? (
                <p className={clsx("mt-0.5 font-black uppercase tracking-[0.18em]", styles.position)}>
                  {positionLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {showName ? (
            <div className="absolute inset-x-[11%] bottom-[13%] z-20 text-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className={clsx("font-black uppercase leading-none tracking-[0.04em]", styles.name)}>
                {player?.lastName ?? "Tom plats"}
              </p>
              <p className={clsx("mt-1 uppercase tracking-[0.24em] text-cyan-100/90", styles.meta)}>
                {player ? player.firstName : "Ledig plats"}
              </p>
            </div>
          ) : null}

          {!faceOnly ? (
            <div className="absolute inset-x-[10%] bottom-[5.5%] z-20 flex items-end justify-between text-[#654315]">
              <div className="space-y-0.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-[#81673f]">Lagkort</p>
                <p className="text-[8px] font-black uppercase tracking-[0.2em]">Football Team</p>
              </div>
              <div className="rounded-full border border-[#cda54b] bg-white/36 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em]">
                UT
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
