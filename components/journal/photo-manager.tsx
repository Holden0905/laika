"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  PHOTO_BUCKET,
  validatePhotoFile,
  describeValidationError,
  extensionForFile,
  buildPhotoStoragePath,
  ALLOWED_PHOTO_MIME,
} from "@/lib/journal/photos"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { addEntryPhoto, deleteEntryPhoto } from "@/app/(authed)/journal/actions"
import { PhotoTile, type ManagedPhoto } from "./photo-tile"

export type InitialPhoto = {
  photo_id: string
  storage_path: string
  signed_url: string
}

/**
 * Direct-to-storage photo upload UI. Two modes:
 *   - "new":  the entry hasn't been created yet. Photos upload to storage at the
 *             client-provided entry_id path; we render hidden inputs so the parent
 *             form can submit the paths along with the rest of the entry.
 *   - "edit": the entry already exists. Each successful upload immediately calls
 *             addEntryPhoto on the server so the row is persisted.
 *
 * Direct-to-storage upload bypasses Vercel's 4.5 MB serverless request body cap.
 */
export function PhotoManager({
  entryId,
  userId,
  mode,
  initialPhotos = [],
}: {
  entryId: string
  userId: string
  mode: "new" | "edit"
  initialPhotos?: InitialPhoto[]
}) {
  const router = useRouter()
  const [photos, setPhotos] = useState<ManagedPhoto[]>(() =>
    initialPhotos.map((p) => ({
      localId: p.photo_id,
      status: "ready" as const,
      fileName: p.storage_path.split("/").pop() ?? "photo",
      storagePath: p.storage_path,
      previewUrl: p.signed_url,
      photoId: p.photo_id,
    }))
  )
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFiles(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return
    setError(null)

    for (const file of Array.from(filesList)) {
      const valErr = validatePhotoFile(file)
      if (valErr) {
        setError(describeValidationError(valErr))
        continue
      }

      const localId = crypto.randomUUID()
      const ext = extensionForFile(file)
      const filename = `${crypto.randomUUID()}.${ext}`
      const storagePath = buildPhotoStoragePath({ userId, entryId, filename })
      const previewUrl = URL.createObjectURL(file)

      setPhotos((prev) => [
        ...prev,
        {
          localId,
          status: "uploading",
          fileName: file.name,
          storagePath,
          previewUrl,
        },
      ])

      try {
        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(storagePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          })
        if (upErr) throw new Error(upErr.message)

        if (mode === "edit") {
          const fd = new FormData()
          fd.set("entry_id", entryId)
          fd.set("storage_path", storagePath)
          const result = await addEntryPhoto(fd)
          if ("error" in result && result.error) throw new Error(result.error)
          const photoId = "id" in result ? result.id : undefined
          setPhotos((prev) =>
            prev.map((p) =>
              p.localId === localId ? { ...p, status: "ready", photoId } : p
            )
          )
        } else {
          setPhotos((prev) =>
            prev.map((p) =>
              p.localId === localId ? { ...p, status: "ready" } : p
            )
          )
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed."
        setPhotos((prev) =>
          prev.map((p) =>
            p.localId === localId ? { ...p, status: "error", error: msg } : p
          )
        )
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleRemove(photo: ManagedPhoto) {
    setError(null)
    if (mode === "edit" && photo.photoId) {
      const fd = new FormData()
      fd.set("photo_id", photo.photoId)
      const result = await deleteEntryPhoto(fd)
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
    } else if (photo.storagePath) {
      // New mode or error-state tile: remove the orphaned storage object directly.
      await supabase.storage.from(PHOTO_BUCKET).remove([photo.storagePath])
    }

    setPhotos((prev) => prev.filter((p) => p.localId !== photo.localId))
    if (photo.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(photo.previewUrl)
    }
    if (mode === "edit") router.refresh()
  }

  const readyPhotos = photos.filter(
    (p) => p.status === "ready" && p.storagePath
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden inputs for the parent form to pick up on submit (new mode only). */}
      {mode === "new"
        ? readyPhotos.map((p) => (
            <input
              key={p.localId}
              type="hidden"
              name="photo_paths"
              value={p.storagePath}
            />
          ))
        : null}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((p) => (
            <PhotoTile key={p.localId} photo={p} onRemove={() => handleRemove(p)} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_PHOTO_MIME.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
          id={`photo-input-${entryId}`}
        />
        <label
          htmlFor={`photo-input-${entryId}`}
          className="relative inline-flex w-fit cursor-pointer items-center gap-3 border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid"
        >
          <CornerMarks />
          <span>+ Attach Photograph</span>
          <StatusDot active />
        </label>
        <p className="text-[9px] tracking-[0.12em] text-amber-dim">
          JPEG · PNG · WEBP · HEIC · GIF — UP TO 10 MB EACH · MULTIPLE OK
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="relative border border-red/40 px-3 py-2 text-[10.5px] text-red"
          style={{ background: "var(--red-dim)" }}
        >
          <CornerMarks />
          {error}
        </div>
      ) : null}
    </div>
  )
}
