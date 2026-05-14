import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { MoodBar } from "@/components/journal/mood-bar"
import { TagPill } from "@/components/journal/tag-pill"
import { DeleteEntryButton } from "@/components/journal/delete-entry-button"
import {
  formatEntryDate,
  formatLongDate,
  padEntryNumber,
} from "@/lib/journal/format"
import { PHOTO_BUCKET } from "@/lib/journal/photos"

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ warning?: string }>

type EntryRow = {
  id: string
  title: string | null
  body: string
  mood: number | null
  entry_date: string
  entry_number: number
  is_active: boolean
  created_at: string
  updated_at: string
  entry_tags: Array<{ tags: { name: string } | null }> | null
}

type PhotoRow = {
  id: string
  storage_path: string
  caption: string | null
}

export default async function EntryDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const { warning } = await searchParams
  const supabase = await createClient()

  const [{ data, error }, photosRes] = await Promise.all([
    supabase
      .from("entries_with_number")
      .select(
        `
        id,
        title,
        body,
        mood,
        entry_date,
        entry_number,
        is_active,
        created_at,
        updated_at,
        entry_tags ( tags ( name ) )
        `
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("entry_photos")
      .select("id, storage_path, caption")
      .eq("entry_id", id)
      .order("created_at", { ascending: true }),
  ])

  if (error) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-red">Query failed: {error.message}</p>
      </main>
    )
  }
  if (!data) notFound()

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const entry = data as unknown as EntryRow
  const tags =
    entry.entry_tags
      ?.map((r) => r.tags?.name)
      .filter((n): n is string => Boolean(n))
      .sort() ?? []

  const updatedDifferent =
    new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 2000

  // Resolve signed URLs for any attached photos. 1 hr TTL is plenty for a page load.
  const photoRows = (photosRes.data as PhotoRow[] | null) ?? []
  let photos: Array<{ id: string; caption: string | null; signed_url: string }> = []
  if (photoRows.length > 0) {
    const paths = photoRows.map((p) => p.storage_path)
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 3600)
    const urlByPath = new Map<string, string>(
      (signed ?? [])
        .filter((s): s is { path: string; signedUrl: string; error: null } =>
          Boolean(s.signedUrl && s.path)
        )
        .map((s) => [s.path, s.signedUrl])
    )
    photos = photoRows
      .map((p) => ({
        id: p.id,
        caption: p.caption,
        signed_url: urlByPath.get(p.storage_path) ?? "",
      }))
      .filter((p) => p.signed_url)
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header block */}
      <div className="mb-8">
        <SectionHeader
          label={`Entry ${padEntryNumber(entry.entry_number)} — Detail`}
          className="mb-3"
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="max-w-[480px] text-[24px] font-light leading-snug tracking-[0.04em] text-line">
            {entry.title?.trim() || "UNTITLED TRANSMISSION"}
          </h1>
          <div className="flex flex-col items-end gap-2">
            <span className="text-[9px] tracking-[0.12em] text-amber-dim">
              {formatLongDate(entry.entry_date)}
            </span>
            <MoodBar value={entry.mood} />
          </div>
        </div>
        <div className="mt-4">
          <Ruler count={32} />
        </div>
      </div>

      {warning ? (
        <div
          role="alert"
          className="relative mb-6 flex items-start gap-2 border border-amber-dim px-3 py-2"
          style={{ background: "rgba(201,162,74,0.08)" }}
        >
          <CornerMarks />
          <span
            className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
            style={{ background: "var(--amber)" }}
            aria-hidden
          />
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] text-amber">Partial Success</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-line-mid">{warning}</p>
          </div>
        </div>
      ) : null}

      {/* Body panel */}
      <div className="relative border border-line-dim p-6">
        <CornerMarks />
        <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed tracking-[0.02em] text-line">
          {entry.body}
        </pre>
      </div>

      {/* Photographic record */}
      {photos.length > 0 ? (
        <div className="mt-6">
          <SectionHeader label="Photographic Record" className="mb-3" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((p) => (
              <a
                key={p.id}
                href={p.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden border border-line-dim transition-colors hover:border-line-mid"
                aria-label={p.caption ?? "Photograph"}
              >
                <CornerMarks />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.signed_url}
                  alt={p.caption ?? ""}
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tags */}
      {tags.length > 0 ? (
        <div className="mt-6">
          <SectionHeader label="Tags · Brozosphere Wiki-Links" className="mb-3" />
          <div className="flex flex-wrap gap-[6px]">
            {tags.map((t) => (
              <TagPill key={t} name={t} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Metadata */}
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line-ghost pt-4 text-[9px] uppercase tracking-[0.12em] text-amber-dim">
        <div className="flex justify-between">
          <span>Logged</span>
          <span className="text-line-mid normal-case tracking-[0.04em]">
            {formatEntryDate(entry.created_at.slice(0, 10))}
          </span>
        </div>
        {updatedDifferent ? (
          <div className="flex justify-between">
            <span>Last Edit</span>
            <span className="text-line-mid normal-case tracking-[0.04em]">
              {formatEntryDate(entry.updated_at.slice(0, 10))}
            </span>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={`/journal/${entry.id}/edit`}
          className="relative flex items-center gap-3 border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid"
        >
          <CornerMarks />
          <span>Edit Transmission</span>
          <StatusDot active />
        </Link>
        <Link
          href="/journal"
          className="border border-transparent px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
        >
          Back to Log
        </Link>
        <div className="ml-auto">
          <DeleteEntryButton entryId={entry.id} />
        </div>
      </div>
    </main>
  )
}
