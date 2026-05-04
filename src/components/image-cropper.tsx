"use client";

import React, { useEffect, useRef, useState } from "react";

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth?: number;
  imageHeight?: number;
};

interface ImageCropperProps {
  imageUrl: string;
  initialCrop?: CropArea;
  onCropChange: (crop: CropArea) => void;
  aspectRatio?: number;
  minCropSize?: number;
  maxCropSize?: number;
  onReset?: () => void;
}

type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type Interaction =
  | { type: "move"; startX: number; startY: number; startCrop: CropArea }
  | { type: "resize"; handle: ResizeHandle; startX: number; startY: number; startCrop: CropArea };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCrop(
  crop: CropArea,
  imageSize: { width: number; height: number },
  aspectRatio: number,
  minCropSize: number,
  maxCropSize?: number,
) {
  const maxWidth = maxCropSize ? Math.min(maxCropSize, imageSize.width) : imageSize.width;
  let width = clamp(crop.width, minCropSize, maxWidth);
  let height = aspectRatio > 0 ? width / aspectRatio : crop.height;

  if (height > imageSize.height) {
    height = imageSize.height;
    width = aspectRatio > 0 ? height * aspectRatio : width;
  }

  let x = clamp(crop.x, 0, imageSize.width - width);
  let y = clamp(crop.y, 0, imageSize.height - height);

  if (y + height > imageSize.height) {
    y = imageSize.height - height;
  }

  if (x + width > imageSize.width) {
    x = imageSize.width - width;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    imageWidth: imageSize.width,
    imageHeight: imageSize.height,
  };
}

export function ImageCropper({
  imageUrl,
  initialCrop,
  onCropChange,
  aspectRatio = 1,
  minCropSize = 20,
  maxCropSize,
}: ImageCropperProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropArea>(initialCrop ?? { x: 50, y: 50, width: 100, height: 100 });
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  useEffect(() => {
    if (initialCrop) {
      setCrop(initialCrop);
    }
  }, [initialCrop]);

  useEffect(() => {
    setImageLoaded(false);

    const img = new Image();
    img.onload = () => {
      const nextSize = { width: img.naturalWidth, height: img.naturalHeight };
      setImageSize(nextSize);
      setCrop((current) => normalizeCrop(current, nextSize, aspectRatio, minCropSize, maxCropSize));
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [aspectRatio, imageUrl, maxCropSize, minCropSize]);

  useEffect(() => {
    if (!interaction || !stageRef.current || !imageSize.width || !imageSize.height) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) {
        return;
      }

      const scaleX = imageSize.width / rect.width;
      const scaleY = imageSize.height / rect.height;
      const deltaX = (event.clientX - interaction.startX) * scaleX;
      const deltaY = (event.clientY - interaction.startY) * scaleY;

      let nextCrop = interaction.startCrop;

      if (interaction.type === "move") {
        nextCrop = {
          ...interaction.startCrop,
          x: interaction.startCrop.x + deltaX,
          y: interaction.startCrop.y + deltaY,
        };
      } else {
        const widthDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;

        switch (interaction.handle) {
          case "se":
          case "e":
          case "s":
            nextCrop = {
              ...interaction.startCrop,
              width: interaction.startCrop.width + widthDelta,
            };
            break;
          case "sw":
          case "w":
            nextCrop = {
              ...interaction.startCrop,
              x: interaction.startCrop.x + widthDelta,
              width: interaction.startCrop.width - widthDelta,
            };
            break;
          case "ne":
          case "n":
            nextCrop = {
              ...interaction.startCrop,
              y: interaction.startCrop.y + widthDelta / aspectRatio,
              width: interaction.startCrop.width + widthDelta,
            };
            break;
          case "nw":
            nextCrop = {
              ...interaction.startCrop,
              x: interaction.startCrop.x + widthDelta,
              y: interaction.startCrop.y + widthDelta / aspectRatio,
              width: interaction.startCrop.width - widthDelta,
            };
            break;
        }
      }

      const normalized = normalizeCrop(nextCrop, imageSize, aspectRatio, minCropSize, maxCropSize);
      setCrop(normalized);
      onCropChange(normalized);
    };

    const handleMouseUp = () => {
      setInteraction(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [aspectRatio, imageSize, interaction, maxCropSize, minCropSize, onCropChange]);

  const startMove = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setInteraction({
      type: "move",
      startX: event.clientX,
      startY: event.clientY,
      startCrop: crop,
    });
  };

  const startResize = (handle: ResizeHandle) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setInteraction({
      type: "resize",
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: crop,
    });
  };

  const cropStyle =
    imageLoaded && imageSize.width > 0 && imageSize.height > 0
      ? {
          left: `${(crop.x / imageSize.width) * 100}%`,
          top: `${(crop.y / imageSize.height) * 100}%`,
          width: `${(crop.width / imageSize.width) * 100}%`,
          height: `${(crop.height / imageSize.height) * 100}%`,
        }
      : undefined;

  const stageStyle =
    imageLoaded && imageSize.width >= imageSize.height
      ? { width: "100%", aspectRatio: `${imageSize.width} / ${imageSize.height}` }
      : { height: "100%", aspectRatio: `${imageSize.width} / ${imageSize.height}` };

  if (!imageLoaded) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-[24px] border border-white/10 bg-slate-800/80">
        <div className="text-white/60">Laddar bild...</div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[360px] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-slate-800/80 p-4">
      <div
        ref={stageRef}
        className="relative max-h-full max-w-full overflow-hidden rounded-[20px] bg-slate-950 shadow-[0_18px_48px_rgba(2,6,23,0.45)]"
        style={stageStyle}
      >
        <img
          src={imageUrl}
          alt="Originalfoto"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-fill"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_36%,rgba(2,6,23,0.14)_72%,rgba(2,6,23,0.28)_100%)]"
        />

        {cropStyle ? (
          <div
            className="absolute cursor-move rounded-[18px] border-2 border-cyan-400 bg-cyan-300/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.28),0_0_0_1px_rgba(15,23,42,0.55)]"
            style={cropStyle}
            onMouseDown={startMove}
          >
            <div className="absolute inset-0 rounded-[16px] border border-white/25" />

            {([
              ["nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"],
              ["ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"],
              ["sw", "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"],
              ["se", "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"],
              ["n", "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize"],
              ["s", "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize"],
              ["w", "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize"],
              ["e", "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize"],
            ] as [ResizeHandle, string][]).map(([handle, positionClass]) => (
              <button
                key={handle}
                type="button"
                aria-label={`Ändra storlek ${handle}`}
                onMouseDown={startResize(handle)}
                className={`absolute h-4 w-4 rounded-full border-2 border-slate-950 bg-cyan-400 ${positionClass}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-3 left-3 rounded-2xl bg-black/55 px-3 py-2 text-xs text-white/70 backdrop-blur-sm">
        <div className="mb-1 font-medium">Användning:</div>
        <div>• Dra i mitten för att flytta området</div>
        <div>• Dra i hörnen/kanterna för att ändra storlek</div>
      </div>
    </div>
  );
}
