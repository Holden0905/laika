import Link from "next/link"
import { CornerMarks } from "@/components/ui/schematic"
import { MoodBar } from "./mood-bar"
import { TagPill } from "./tag-pill"
import { formatEntryDate, padEntryNumber } from "@/lib/journal/format"

export type EntryCardData = {
  id: string
  entry_number: number
  title: string | null
  body: string
  entry_date: string
  mood: number | null
  tags: string[]
}

/** Excerpt: ~180 chars off the body, single-line, trimmed. */
function excerpt(body: string, max = 180) {
  const flat = body.replace(/\s+/g, " ").trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

export function EntryCard({ entry }: { entry: EntryCardData }) {
  return (
    <Link
      href={`/journal/${entry.id}`}
      className="group relative block border border-line-dim px-4 py-3 transition-colors hover:border-line-mid"
    >
      <CornerMarks />

      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.12em] text-amber-dim">
            ENTRY {padEntryNumber(entry.entry_number)}
          </p>
          <h3 className="mt-1 text-[13px] font-semibold leading-snug tracking-[0.04em] text-line">
            {entry.title?.trim() || "UNTITLED TRANSMISSION"}
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[9px] tracking-[0.08em] text-amber-dim">
            {formatEntryDate(entry.entry_date)}
          </span>
          <MoodBar value={entry.mood} />
        </div>
      </div>

      <p className="mb-3 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
        {excerpt(entry.body)}
      </p>

      {entry.tags.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {entry.tags.map((t) => (
            <TagPill key={t} name={t} />
          ))}
        </div>
      ) : null}
    </Link>
  )
}
