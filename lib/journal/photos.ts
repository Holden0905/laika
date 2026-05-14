/**
 * Photo upload helpers. Mirrors the entry-photos bucket policy:
 *   - allowed MIME: jpeg, png, webp, heic, heif, gif
 *   - max size: 10 MiB
 *   - storage_path: {user_id}/{entry_id}/{uuid}.{ext}
 */

export const PHOTO_BUCKET = "entry-photos"

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10 MiB

/** MIME → file extension. Used to pick a sane extension for the storage_path. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
}

export const ALLOWED_PHOTO_MIME = Object.keys(EXTENSION_BY_MIME)

export type PhotoValidationError =
  | { kind: "mime"; mime: string }
  | { kind: "size"; size: number }
  | { kind: "empty" }

export function validatePhotoFile(file: File): PhotoValidationError | null {
  if (file.size === 0) return { kind: "empty" }
  if (file.size > MAX_PHOTO_BYTES) return { kind: "size", size: file.size }
  if (!ALLOWED_PHOTO_MIME.includes(file.type)) return { kind: "mime", mime: file.type }
  return null
}

export function describeValidationError(err: PhotoValidationError): string {
  if (err.kind === "empty") return "File is empty."
  if (err.kind === "size") return `File too large (${formatBytes(err.size)}; max 10 MB).`
  return `Unsupported type: ${err.mime || "unknown"}. Accepted: JPEG, PNG, WebP, HEIC, GIF.`
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Pick a storage extension for a file. Prefers MIME mapping; falls back to filename. */
export function extensionForFile(file: File): string {
  const fromMime = EXTENSION_BY_MIME[file.type]
  if (fromMime) return fromMime
  const parts = file.name.split(".")
  if (parts.length < 2) return "bin"
  return parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
}

/** Build a storage_path that satisfies bucket RLS and the entry_photos CHECK constraint. */
export function buildPhotoStoragePath(opts: {
  userId: string
  entryId: string
  filename: string
}): string {
  return `${opts.userId}/${opts.entryId}/${opts.filename}`
}
