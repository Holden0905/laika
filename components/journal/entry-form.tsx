import Link from "next/link"
import { CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"
import { MoodSelector } from "./mood-selector"
import { TagInput } from "./tag-input"
import { PhotoManager, type InitialPhoto } from "./photo-manager"
import { todayDateString } from "@/lib/journal/format"

export type EntryFormInitial = {
  title?: string | null
  body?: string
  mood?: number | null
  entry_date?: string
  tags?: string[]
}

export type EntryFormPhotoConfig = {
  entryId: string
  userId: string
  mode: "new" | "edit"
  initialPhotos?: InitialPhoto[]
}

export function EntryForm({
  action,
  initial,
  error,
  submitLabel = "Transmit Entry",
  cancelHref = "/journal",
  photos,
}: {
  action: (formData: FormData) => Promise<void> | void
  initial?: EntryFormInitial
  error?: string
  submitLabel?: string
  cancelHref?: string
  photos?: EntryFormPhotoConfig
}) {
  return (
    <form action={action} className="flex flex-col gap-6">
      {/* In new mode, the client-generated entry_id rides along so createEntry uses it
          as the row's id — that lets photos be uploaded to {user_id}/{entry_id}/...
          before the entry row exists. */}
      {photos?.mode === "new" ? (
        <input type="hidden" name="entry_id" value={photos.entryId} />
      ) : null}

      <Field label="Field 01 // Transmission Date">
        <input
          name="entry_date"
          type="date"
          required
          defaultValue={initial?.entry_date ?? todayDateString()}
          className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors [color-scheme:dark] focus:border-phosphor"
        />
      </Field>

      <Field label="Field 02 // Title (Optional)">
        <input
          name="title"
          type="text"
          maxLength={200}
          defaultValue={initial?.title ?? ""}
          placeholder="—"
          className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
        />
      </Field>

      <Field label="Field 03 // Body">
        <textarea
          name="body"
          required
          rows={14}
          defaultValue={initial?.body ?? ""}
          placeholder="Begin transmission…"
          className="resize-y border border-line-dim bg-transparent p-3 text-[12px] leading-relaxed tracking-[0.02em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
        />
      </Field>

      <Field label="Field 04 // Mood (Optional)">
        <MoodSelector name="mood" defaultValue={initial?.mood} />
      </Field>

      <Field label="Field 05 // Tags (Optional)">
        <TagInput name="tags" defaultValue={initial?.tags?.join(", ") ?? ""} />
      </Field>

      {photos ? (
        <Field label="Field 06 // Photographic Record (Optional)">
          <PhotoManager
            entryId={photos.entryId}
            userId={photos.userId}
            mode={photos.mode}
            initialPhotos={photos.initialPhotos}
          />
        </Field>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="relative flex items-start gap-2 border border-red/40 px-3 py-2"
          style={{ background: "var(--red-dim)" }}
        >
          <CornerMarks />
          <span
            className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
            style={{ background: "var(--red)", boxShadow: "0 0 6px var(--red)" }}
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.14em] text-red">
              Transmission Failure
            </span>
            <p className="text-[10.5px] leading-relaxed text-red">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="relative flex flex-1 items-center justify-between border border-line-dim px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
        >
          <CornerMarks />
          <span>{submitLabel}</span>
          <span className="flex items-center gap-2 text-amber-dim">
            <span>{"//"}</span>
            <StatusDot active />
          </span>
        </button>
        <Link
          href={cancelHref}
          className="border border-transparent px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Crosshair />
        <Label>{label}</Label>
      </div>
      {children}
    </div>
  )
}
