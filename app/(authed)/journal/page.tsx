import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { EntryCard, type EntryCardData } from "@/components/journal/entry-card"

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

function flattenTags(rows: EntryRow["entry_tags"]): string[] {
  if (!rows) return []
  return rows
    .map((r) => r.tags?.name)
    .filter((n): n is string => Boolean(n))
    .sort()
}

export default async function JournalListPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data, error: queryError } = await supabase
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
    .eq("is_active", true)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const entries: EntryCardData[] =
    (data as unknown as EntryRow[] | null)?.map((row) => ({
      id: row.id,
      entry_number: row.entry_number,
      title: row.title,
      body: row.body,
      entry_date: row.entry_date,
      mood: row.mood,
      tags: flattenTags(row.entry_tags),
    })) ?? []

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <div className="mb-8">
        <SectionHeader label="Transmission Log — Index" className="mb-3" />
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
              TRANSMISSION LOG
            </h1>
            <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
              {entries.length === 0
                ? "No transmissions logged. Initiate first entry to begin the cycle."
                : `${entries.length} transmission${entries.length === 1 ? "" : "s"} on file. Sorted by date.`}
            </p>
          </div>
          <Link
            href="/journal/new"
            className="relative flex w-full items-center justify-between gap-3 border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid sm:w-auto sm:justify-start"
          >
            <CornerMarks />
            <span>+ New Entry</span>
            <StatusDot active />
          </Link>
        </div>
        <div className="mt-4">
          <Ruler count={40} />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="relative mb-6 flex items-start gap-2 border border-red/40 px-3 py-2"
          style={{ background: "var(--red-dim)" }}
        >
          <CornerMarks />
          <span className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: "var(--red)" }} aria-hidden />
          <p className="text-[10.5px] leading-relaxed text-red">{error}</p>
        </div>
      ) : null}

      {queryError ? (
        <div className="border border-red/40 px-3 py-2 text-[10.5px] text-red" style={{ background: "var(--red-dim)" }}>
          Query failed: {queryError.message}
        </div>
      ) : entries.length === 0 ? (
        <div className="relative border border-line-dim px-6 py-12 text-center">
          <CornerMarks />
          <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">No Signal</p>
          <p className="mt-3 text-[11px] tracking-[0.04em] text-line-mid">
            The log is empty. Transmit your first entry to begin.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  )
}
