"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VIEWPORT_SIZE = 240;
const OUTPUT_SIZE = 320;
const MAX_ZOOM = 3;

type Point = { x: number; y: number };
type Size = { width: number; height: number };

function clampPosition(pos: Point, size: Size): Point {
  const minX = VIEWPORT_SIZE - size.width;
  const minY = VIEWPORT_SIZE - size.height;
  return {
    x: Math.min(0, Math.max(minX, pos.x)),
    y: Math.min(0, Math.max(minY, pos.y)),
  };
}

/** Drag-to-pan, slider-to-zoom avatar cropper. Renders the crop to a fixed-size JPEG via canvas. */
export function AvatarCropDialog({
  previewUrl,
  open,
  onCancel,
  onCropped,
}: {
  previewUrl: string | null;
  open: boolean;
  onCancel: () => void;
  onCropped: (url: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const dragState = useRef<{ start: Point; startPosition: Point } | null>(null);

  const baseScale = naturalSize
    ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
    : 1;
  const scale = baseScale * zoom;
  const displayedSize: Size = naturalSize
    ? { width: naturalSize.width * scale, height: naturalSize.height * scale }
    : { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE };

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    setNaturalSize(size);
    const initialScale = Math.max(VIEWPORT_SIZE / size.width, VIEWPORT_SIZE / size.height);
    setPosition({
      x: (VIEWPORT_SIZE - size.width * initialScale) / 2,
      y: (VIEWPORT_SIZE - size.height * initialScale) / 2,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture isn't supported for this pointer type in some browsers;
      // dragging still works via normal event bubbling.
    }
    dragState.current = {
      start: { x: event.clientX, y: event.clientY },
      startPosition: position,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    event.preventDefault();
    const next = {
      x: dragState.current.startPosition.x + (event.clientX - dragState.current.start.x),
      y: dragState.current.startPosition.y + (event.clientY - dragState.current.start.y),
    };
    setPosition(clampPosition(next, displayedSize));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragState.current = null;
  }

  function handleZoomChange(nextZoom: number) {
    setZoom(nextZoom);
    if (!naturalSize) return;
    const nextScale = baseScale * nextZoom;
    setPosition((prev) =>
      clampPosition(prev, {
        width: naturalSize.width * nextScale,
        height: naturalSize.height * nextScale,
      })
    );
  }

  function handleSave() {
    const img = imgRef.current;
    if (!img || !naturalSize) return;

    const sourceSize = VIEWPORT_SIZE / scale;
    const sourceX = -position.x / scale;
    const sourceY = -position.y / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCropped(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crop Photo</DialogTitle>
          <DialogDescription>
            Drag to reposition, use the slider to zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="relative touch-none overflow-hidden rounded-full bg-foreground/[0.06]"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={previewUrl}
                alt=""
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onLoad={handleImageLoad}
                className="absolute top-0 left-0 max-w-none cursor-grab select-none active:cursor-grabbing"
                style={{
                  width: displayedSize.width,
                  height: displayedSize.height,
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
              />
            )}
          </div>

          <div className="flex w-full max-w-xs items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-text-tertiary" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!naturalSize}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
