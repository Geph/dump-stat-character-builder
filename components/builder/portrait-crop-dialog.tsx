"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  PORTRAIT_CROP_MAX_ZOOM,
  PORTRAIT_CROP_MIN_ZOOM,
  cropPortraitToDataUrl,
  defaultPortraitCrop,
  normalizePortraitCrop,
  panPortraitCrop,
  resolvePortraitCropRect,
  type PortraitCrop,
} from "@/lib/portrait"

type PortraitCropDialogProps = {
  imageSrc: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (dataUrl: string) => void
}

export function PortraitCropDialog({
  imageSrc,
  open,
  onOpenChange,
  onApply,
}: PortraitCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; crop: PortraitCrop } | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [crop, setCrop] = useState<PortraitCrop>(defaultPortraitCrop())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const applyLoadedImage = (image: HTMLImageElement) => {
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) return
    setNaturalSize({ width, height })
    setCrop(normalizePortraitCrop(width, height, defaultPortraitCrop()))
    setLoadError(null)
  }

  useEffect(() => {
    if (!open) return
    setCrop(defaultPortraitCrop())
    setNaturalSize({ width: 0, height: 0 })
    setLoadError(null)
    setApplying(false)
  }, [open, imageSrc])

  useEffect(() => {
    if (!open || !imageSrc) return
    const image = imageRef.current
    if (image?.complete) applyLoadedImage(image)
  }, [open, imageSrc])

  const loaded = naturalSize.width > 0 && naturalSize.height > 0
  const rect = loaded
    ? resolvePortraitCropRect(naturalSize.width, naturalSize.height, crop)
    : null

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    applyLoadedImage(event.currentTarget)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!loaded) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, crop }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const viewport = viewportRef.current
    if (!drag || !viewport || !loaded) return
    const box = viewport.getBoundingClientRect()
    if (box.width <= 0) return
    const scale = box.width / rect!.size
    const deltaX = (event.clientX - drag.x) / (scale * naturalSize.width)
    const deltaY = (event.clientY - drag.y) / (scale * naturalSize.height)
    setCrop(
      panPortraitCrop(naturalSize.width, naturalSize.height, drag.crop, -deltaX, -deltaY),
    )
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  const handleApply = () => {
    const image = imageRef.current
    if (!image || !loaded) return
    setApplying(true)
    try {
      onApply(cropPortraitToDataUrl(image, crop))
      onOpenChange(false)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not crop the portrait.")
      setApplying(false)
    }
  }

  const imageStyle = (() => {
    if (!rect || !loaded) return undefined
    return {
      width: `${(naturalSize.width / rect.size) * 100}%`,
      height: `${(naturalSize.height / rect.size) * 100}%`,
      left: `${(-rect.sx / rect.size) * 100}%`,
      top: `${(-rect.sy / rect.size) * 100}%`,
    } as const
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Crop portrait</DialogTitle>
          <DialogDescription>
            Drag to reframe and zoom to a 1:1 square. This is how the picture appears on
            the character list and sheet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div
            ref={viewportRef}
            className="relative mx-auto aspect-square w-full max-w-sm cursor-grab touch-none overflow-hidden rounded-xl bg-muted active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {imageSrc ? (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Portrait to crop"
                draggable={false}
                onLoad={handleImageLoad}
                onError={() => setLoadError("Could not load that image.")}
                className="absolute max-w-none select-none"
                style={imageStyle}
              />
            ) : null}
          </div>
          <label className="block space-y-1 text-sm font-medium text-foreground">
            Zoom
            <input
              type="range"
              min={PORTRAIT_CROP_MIN_ZOOM}
              max={PORTRAIT_CROP_MAX_ZOOM}
              step={0.01}
              disabled={!loaded}
              value={crop.zoom}
              onChange={(event) => {
                if (!loaded) return
                setCrop(
                  normalizePortraitCrop(naturalSize.width, naturalSize.height, {
                    ...crop,
                    zoom: Number(event.target.value),
                  }),
                )
              }}
              className="w-full accent-primary"
            />
          </label>
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-2 border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!loaded || applying}
            onClick={handleApply}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? "Saving…" : "Use square crop"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
