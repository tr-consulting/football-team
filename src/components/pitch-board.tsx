"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { Grip, RotateCcw } from "lucide-react";

import { PlayerCard } from "@/components/player-card";
import { LineupSlot, Player } from "@/lib/types";

type PitchBoardProps = {
  slots: LineupSlot[];
  players: Player[];
  onAssignPlayer: (slotKey: string, playerId: string | null) => void;
  onMoveSlot: (slotKey: string, offsetX: number, offsetY: number) => void;
  onResetSlot: (slotKey: string) => void;
};

type DragState = {
  pointerId: number;
  slotKey: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

function getDepthScale(y: number) {
  return 0.62 + y / 360;
}

function SlotDropZone({
  slot,
  players,
  player,
  onAssignPlayer,
  onMoveSlot,
  onResetSlot,
}: {
  slot: LineupSlot;
  players: Player[];
  player?: Player;
  onAssignPlayer: (slotKey: string, playerId: string | null) => void;
  onMoveSlot: (slotKey: string, offsetX: number, offsetY: number) => void;
  onResetSlot: (slotKey: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slot.slotKey,
    data: { type: "slot", slotKey: slot.slotKey },
  });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const depthScale = getDepthScale(slot.y);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || !cardRef.current) {
        return;
      }

      const nextX = dragState.originX + (event.clientX - dragState.startX);
      const nextY = dragState.originY + (event.clientY - dragState.startY);

      const clampedX = Math.max(-200, Math.min(200, nextX));
      const clampedY = Math.max(-200, Math.min(200, nextY));

      onMoveSlot(dragState.slotKey, clampedX, clampedY);
    }

    function handlePointerUp(event: PointerEvent) {
      if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
        return;
      }

      const dragState = dragStateRef.current;
      const nextX = dragState.originX + (event.clientX - dragState.startX);
      const nextY = dragState.originY + (event.clientY - dragState.startY);

      // Auto-reset if dragged too far
      if (Math.abs(nextX) > 200 || Math.abs(nextY) > 200) {
        onResetSlot(dragState.slotKey);
      }

      dragStateRef.current = null;
      setIsMoving(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onMoveSlot, onResetSlot]);

  return (
    <div
      ref={setNodeRef}
      className="absolute -translate-x-1/2"
      style={{
        left: `calc(${slot.x}% + ${slot.manualOffsetX}px)`,
        top: `calc(${slot.y}% + ${slot.manualOffsetY}px)`,
        zIndex: Math.round(slot.y * 10),
      }}
    >
      <div
        ref={cardRef}
        className={clsx(
          "relative transition duration-200",
          isOver && "scale-[1.04]",
          isMoving && "cursor-grabbing",
        )}
        style={{
          transform: `translateY(-50%) scale(${depthScale})`,
          transformOrigin: "center bottom",
        }}
      >
        <div className="absolute inset-x-6 bottom-8 h-5 rounded-full bg-black/35 blur-md" />
        <PlayerCard player={player} positionLabel={slot.positionLabel} isEmpty={!player} />

        {player ? (
          <div className="mt-2 rounded-[22px] border border-white/10 bg-slate-950/72 p-2.5 shadow-[0_16px_24px_rgba(3,7,18,0.28)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[10px] font-semibold tracking-[0.2em] text-white uppercase"
                onPointerDown={(event) => {
                  event.preventDefault();
                  dragStateRef.current = {
                    pointerId: event.pointerId,
                    slotKey: slot.slotKey,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: slot.manualOffsetX,
                    originY: slot.manualOffsetY,
                  };
                  setIsMoving(true);
                }}
              >
                <Grip size={11} />
                Flytta
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 p-2 text-white/75 transition hover:text-white"
                onClick={() => onResetSlot(slot.slotKey)}
                aria-label={`Återställ ${slot.positionLabel}`}
              >
                <RotateCcw size={13} />
              </button>
            </div>

            <select
              className="mt-2 w-full rounded-2xl border border-white/12 bg-black/28 px-3 py-2.5 text-xs text-white outline-none"
              value={slot.playerId ?? ""}
              onChange={(event) => onAssignPlayer(slot.slotKey, event.target.value || null)}
            >
              <option value="">Välj spelare</option>
              {players.map((availablePlayer) => (
                <option key={availablePlayer.id} value={availablePlayer.id}>
                  #{availablePlayer.number} {availablePlayer.firstName} {availablePlayer.lastName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-2 rounded-full border border-dashed border-white/14 bg-slate-950/60 px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/56 shadow-[0_14px_22px_rgba(3,7,18,0.22)] backdrop-blur-sm">
            Dra hit spelare
          </div>
        )}
      </div>
    </div>
  );
}

export function PitchBoard({
  slots,
  players,
  onAssignPlayer,
  onMoveSlot,
  onResetSlot,
}: PitchBoardProps) {
  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  return (
    <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,#10233d_0%,#0b1627_100%)] p-5 shadow-[0_34px_90px_rgba(3,7,18,0.34)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-emerald-100/58">
            Laguppställning
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
            3D-matchplan
          </h3>
        </div>
        <p className="max-w-xs text-right text-sm text-white/48">
          Korten står upp ovanför planen. Dra korten eller välj spelare per position.
        </p>
      </div>

      <div className="relative aspect-[5/4] overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,#111f35_0%,#0c1524_100%)]">
        <div
          className="absolute inset-x-[6%] bottom-[7%] top-[14%] overflow-hidden [clip-path:polygon(9%_0,91%_0,100%_100%,0_100%)] rounded-[28px] bg-[linear-gradient(180deg,#5cad31_0%,#4e9f2c_18%,#4b942a_40%,#3c7c21_100%)] shadow-[0_36px_60px_rgba(3,10,19,0.5)]"
          style={{ transform: "perspective(1000px) rotateX(12deg) rotateZ(-0.4deg)", transformOrigin: "center bottom" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%)] opacity-80" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_34px,transparent_34px,transparent_70px)] opacity-65" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_18%,transparent_78%,rgba(0,0,0,0.24))]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.45),transparent_90%)]" />
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-90" />
          <div className="absolute left-[11%] right-[11%] top-[8%] bottom-[8%] border-[1.5px] border-white/82" />
          <div
            className="absolute left-1/2 top-[50%] h-[19%] w-[19%] rounded-full border-[1.5px] border-white/82 shadow-[0_0_28px_rgba(255,255,255,0.12)]"
            style={{ transform: "translateX(-50%) translateY(-50%) scaleX(0.92)" }}
          />
          <div className="absolute left-[30%] right-[30%] top-[8%] h-[12%] border-x-[1.5px] border-b-[1.5px] border-white/82 rounded-b-[26px]" />
          <div className="absolute left-[37%] right-[37%] top-[8%] h-[4.5%] border-x-[1.5px] border-b-[1.5px] border-white/82" />
          <div className="absolute left-[24%] right-[24%] bottom-[8%] h-[12%] border-x-[1.5px] border-t-[1.5px] border-white/82 rounded-t-[26px]" />
          <div className="absolute left-[33%] right-[33%] bottom-[8%] h-[4.5%] border-x-[1.5px] border-t-[1.5px] border-white/82" />
          <div className="absolute left-1/2 top-[50%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
          <div className="absolute left-1/2 top-[19%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/90" />
          <div className="absolute left-1/2 bottom-[19%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/90" />
        </div>

        {slots.map((slot) => (
          <SlotDropZone
            key={slot.slotKey}
            slot={slot}
            players={players}
            player={slot.playerId ? playerMap.get(slot.playerId) : undefined}
            onAssignPlayer={onAssignPlayer}
            onMoveSlot={onMoveSlot}
            onResetSlot={onResetSlot}
          />
        ))}
      </div>
    </div>
  );
}
