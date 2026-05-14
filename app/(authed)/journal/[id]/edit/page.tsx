import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Ruler, SectionHeader } from "@/components/ui/schematic"
import { EntryForm } from "@/components/journal/entry-form"
import type { InitialPhoto } from "@/components/journal/photo-manager"
import { padEntryNumber } from "@/lib/journal/format"
import { PHOTO_BUCKET } from "@/lib/journal/photos"
import { updateEntry } from "../../actions"

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ error?: string }>

type EntryRow = {
  id: string
  title: string | null
  body: string
  mood: number | null
  entry_date: string
  entry_number: number
  entry_tags: Array<{ tags: { name: string } | null }> | null
}

type PhotoRow = {
  id: string
  storage_path: string
  caption: string | null
  created_at: string
}

export default async function EditEntryPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data, error: queryError }, photosRes] = await Promise.all([
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
        entry_tags ( tags ( name ) )
        `
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("entry_photos")
      .select("id, storage_path, caption, created_at")
      .eq("entry_id", id)
      .order("created_at", { ascending: true }),
  ])

  if (queryError) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-red">Query failed: {queryError.message}</p>
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

  const photoRows = (photosRes.data as PhotoRow[] | null) ?? []
  let initialPhotos: InitialPhoto[] = []
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
    initialPhotos = photoRows
      .map((p) => ({
        photo_id: p.id,
        storage_path: p.storage_path,
        signed_url: urlByPath.get(p.storage_path) ?? "",
      }))
      .filter((p) => p.signed_url)
  }

  const boundUpdate = updateEntry.bind(null, entry.id)

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <SectionHeader
          label={`Entry ${padEntryNumber(entry.entry_number)} — Edit`}
          className="mb-3"
        />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          MODIFY TRANSMISSION
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          Existing values pre-filled. Replacing the tag string replaces the full set. Photos
          attached or removed here persist immediately.
        </p>
        <div className="mt-4">
          <Ruler count={32} />
        </div>
      </div>

      <EntryForm
        action={boundUpdate}
        initial={{
          title: entry.title,
          body: entry.body,
          mood: entry.mood,
          entry_date: entry.entry_date,
          tags,
        }}
        error={error}
        submitLabel="Save Changes"
        cancelHref={`/journal/${entry.id}`}
        photos={{
          entryId: entry.id,
          userId: user.id,
          mode: "edit",
          initialPhotos,
        }}
      />
    </main>
  )
}
