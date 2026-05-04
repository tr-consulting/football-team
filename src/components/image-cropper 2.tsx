import React, { useEffect, useMemo, useRef, useState } from "react";

type CropArea = { x: number; y: number; width: number; height: number };

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

function makeSquareCrop(crop: CropArea, aspectRatio: number, imageSize: { width: number; height: number }) {
  const targetHeight = crop.width / aspectRatio;
  const next = {
    ...crop,
    height: targetHeight,
  };

  if (next.y + next.height > imageSize.height) {
    next.height = imageSize.height - next.y;
    next.width = next.height * aspectRatio;
  }

  if (next.x + next.width > imageSize.width) {
    next.width = imageSize.width - next.x;
    next.height = next.width / aspectRatio;
  }

  return next;
}

export function ImageCropper({
  imageUrl,
  initialCrop,
  onCropChange,
  aspectRatio = 1,
  minCropSize = 20,
  maxCropSize,
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
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
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const renderedImage = useMemo(() => {
    if (!imageLoaded || !containerSize.width || !containerSize.height || !imageSize.width || !imageSize.height) {
      return null;
    }

    const containerAspect = containerSize.width / containerSize.height;
    const imageAspect = imageSize.width / imageSize.height;

    let width = containerSize.width;
    let height = containerSize.height;

    if (imageAspect > containerAspect) {
      height = width / imageAspect;
    } else {
      width = height * imageAspect;
    }

    return {
      width,
      height,
      left: (containerSize.width - width) / 2,
      top: (containerSize.height - height) / 2,
      scaleX: width / imageSize.width,
      scaleY: height / imageSize.height,
    };
  }, [containerSize.height, containerSize.width, imageLoaded, imageSize.height, imageSize.width]);

  const clampCropArea = (nextCrop: CropArea) => {
    const maxWidthLimit = maxCropSize ? Math.min(maxCropSize, imageSize.width) : imageSize.width;
    const maxHeightLimit = maxCropSize ? Math.min(maxCropSize, imageSize.height) : imageSize.height;

    let width = clamp(nextCrop.width, minCropSize, maxWidthLimit);
    let height = clamp(nextCrop.height, minCropSize, maxHeightLimit);
    let x = clamp(nextCrop.x, 0, imageSize.width - width);
    let y = clamp(nextCrop.y, 0, imageSize.height - height);

    if (aspectRatio > 0) {
      const ratioCrop = makeSquareCrop({ x, y, width, height }, aspectRatio, imageSize);
      width = clamp(ratioCrop.width, minCropSize, maxWidthLimit);
      height = clamp(ratioCrop.height, minCropSize, maxHeightLimit);
      x = clamp(ratioCrop.x, 0, imageSize.width - width);
      y = clamp(ratioCrop.y, 0, imageSize.height - height);
    }

    return { x, y, width, height };
  };

  useEffect(() => {
    if (!interaction || !renderedImage) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const scaleX = imageSize.width / renderedImage.width;
      const scaleY = imageSize.height / renderedImage.height;
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
        const handle = interaction.handle;
        const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

        switch (handle) {
          case "se":
            nextCrop = {
              ...interaction.startCrop,
              width: interaction.startCrop.width + dominantDelta,
              height: interaction.startCrop.height + dominantDelta / aspectRatio,
            };
            break;
          case "sw":
            nextCrop = {
              x: interaction.startCrop.x + dominantDelta,
              y: interaction.startCrop.y,
              width: interaction.startCrop.width - dominantDelta,
              height: interaction.startCrop.height - dominantDelta / aspectRatio,
            };
            break;
          case "ne":
            nextCrop = {
              x: interaction.startCrop.x,
              y: interaction.startCrop.y + dominantDelta / aspectRatio,
              width: interaction.startCrop.width + dominantDelta,
              height: interaction.startCrop.height - dominantDelta / aspectRatio,
            };
            break;
          case "nw":
            nextCrop = {
              x: interaction.startCrop.x + dominantDelta,
              y: interaction.startCrop.y + dominantDelta / aspectRatio,
              width: interaction.startCrop.width - dominantDelta,
              height: interaction.startCrop.height - dominantDelta / aspectRatio,
            };
            break;
          case "e":
            nextCrop = {
              ...interaction.startCrop,
              width: interaction.startCrop.width + deltaX,
              height: interaction.startCrop.height + deltaX / aspectRatio,
            };
            break;
          case "w":
            nextCrop = {
              x: interaction.startCrop.x + deltaX,
              y: interaction.startCrop.y + deltaX / aspectRatio / 2,
              width: interaction.startCrop.width - deltaX,
              height: interaction.startCrop.height - deltaX / aspectRatio,
            };
            break;
          case "s":
            nextCrop = {
              ...interaction.startCrop,
              width: interaction.startCrop.width + deltaY * aspectRatio,
              height: interaction.startCrop.height + deltaY,
            };
            break;
          case "n":
            nextCrop = {
              x: interaction.startCrop.x + (deltaY * aspectRatio) / 2,
              y: interaction.startCrop.y + deltaY,
              width: interaction.startCrop.width - deltaY * aspectRatio,
              height: interaction.startCrop.height - deltaY,
            };
            break;
        }
      }

      const clamped = clampCropArea(nextCrop);
      setCrop(clamped);
      onCropChange(clamped);
    };

    const handlePointerUp = () => {
      setInteraction(null);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [aspectRatio, imageSize.height, imageSize.width, interaction, onCropChange, renderedImage]);

  const cropFrame = renderedImage
    ? {
        left: renderedImage.left + crop.x * renderedImage.scaleX,
        top: renderedImage.top + crop.y * renderedImage.scaleY,
        width: crop.width * renderedImage.scaleX,
        height: crop.height * renderedImage.scaleY,
      }
    : null;

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

  if (!imageLoaded) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-[24px] border border-white/10 bg-slate-800/80">
        <div className="text-white/60">Laddar bild...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[360px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-800/80"
    >
      {renderedImage ? (
        <>
          <img
            src={imageUrl}
            alt="Beskärningsyta"
            draggable={false}
            className="absolute select-none object-contain"
            style={{
              left: renderedImage.left,
              top: renderedImage.top,
              width: renderedImage.width,
              height: renderedImage.height,
            }}
          />

          {cropFrame ? (
            <>
              <div className="absolute bg-black/55" style={{ left: renderedImage.left, top: renderedImage.top, width: renderedImage.width, height: cropFrame.top - renderedImage.top }} />
              <div className="absolute bg-black/55" style={{ left: renderedImage.left, top: cropFrame.top, width: cropFrame.left - renderedImage.left, height: cropFrame.height }} />
              <div className="absolute bg-black/55" style={{ left: cropFrame.left + cropFrame.width, top: cropFrame.top, width: renderedImage.left + renderedImage.width - (cropFrame.left + cropFrame.width), height: cropFrame.height }} />
              <div className="absolute bg-black/55" style={{ left: renderedImage.left, top: cropFrame.top + cropFrame.height, width: renderedImage.width, height: renderedImage.top + renderedImage.height - (cropFrame.top + cropFrame.height) }} />

              <div
                className="absolute cursor-move rounded-[18px] border-2 border-cyan-400 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]"
                style={cropFrame}
                onMouseDown={startMove}
              >
                <div className="absolute inset-0 rounded-[16px] border border-white/20" />

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
            </>
          ) : null}
        </>
      ) : null}

      <div className="absolute bottom-3 left-3 rounded-2xl bg-black/55 px-3 py-2 text-xs text-white/70 backdrop-blur-sm">
        <div className="mb-1 font-medium">Användning:</div>
        <div>• Dra i mitten för att flytta området</div>
        <div>• Dra i hörnen/kanterna för att ändra storlek</div>
      </div>
    </div>
  );
}
