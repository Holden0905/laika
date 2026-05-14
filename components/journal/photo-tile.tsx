"use client"

import { useState } from "react"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"

export type ManagedPhotoStatus = "uploading" | "ready" | "error"

export type ManagedPhoto = {
  localId: string
  status: ManagedPhotoStatus
  fileName: string
  storagePath?: string
  previewUrl?: string
  photoId?: string
  error?: string
}

/**
 * One tile in the photo grid. Three visual states (uploading / ready / error).
 * Delete is two-step armed-and-confirmed (per project convention).
 */
export function PhotoTile({
  photo,
  onRemove,
}: {
  photo: ManagedPhoto
  onRemove: () => void
}) {
  const [armed, setArmed] = useState(false)

  if (photo.status === "uploading") {
    return (
      <div className="group relative aspect-square overflow-hidden border border-line-dim">
        <CornerMarks />
        {photo.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.previewUrl}
            alt=""
            className="h-full w-full object-cover opacity-30"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-void/40">
          <div className="flex flex-col items-center gap-2">
            <StatusDot active color="var(--amber)" />
            <span className="text-[9px] uppercase tracking-[0.14em] text-amber">
              Uplinking…
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (photo.status === "error") {
    return (
      <div
        className="relative aspect-square border border-red/40 p-3"
        style={{ background: "var(--red-dim)" }}
      >
        <CornerMarks />
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <StatusDot active color="var(--red)" />
          <p className="text-[9px] uppercase tracking-[0.14em] text-red">Transmit Failed</p>
          <p className="text-[9px] leading-snug tracking-[0.02em] text-red">
            {photo.error ?? "Unknown error"}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 border border-red/40 bg-void/80 px-2 py-[2px] text-[8px] uppercase tracking-[0.14em] text-red"
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="group relative aspect-square overflow-hidden border border-line-dim">
      <CornerMarks />
      {photo.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.previewUrl}
          alt={photo.fileName}
          className="h-full w-full object-cover"
        />
      ) : null}

      <div className="absolute right-1 top-1">
        {armed ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemove}
              className="border border-red px-2 py-[3px] text-[8px] uppercase tracking-[0.14em] text-line"
              style={{
                background: "var(--red-dim)",
                boxShadow: "0 0 6px rgba(184,64,64,0.4)",
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="border border-line-dim bg-void/85 px-2 py-[3px] text-[8px] uppercase tracking-[0.14em] text-line"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="border border-red/40 bg-void/85 px-2 py-[3px] text-[8px] uppercase tracking-[0.14em] text-red opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Remove photo"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
