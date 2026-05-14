import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Crosshair,
  Label,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import {
  fetchJournalEntriesForExport,
  fetchReflectionResponsesForExport,
} from "@/lib/export/queries"

type SearchParams = Promise<{ error?: string }>

export default async function ExportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [entries, responses] = await Promise.all([
    fetchJournalEntriesForExport(supabase),
    fetchReflectionResponsesForExport(supabase),
  ])

  const journalCount = entries.length
  const responseCount = responses.length
  const reflectionWeeks = new Set(
    responses.map((r) => `${r.reflection_year}-W${r.reflection_week_number}`)
  ).size
  const totalCount = journalCount + responseCount

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader label="Brozosphere Export — Extraction" className="mb-3" />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          ARCHIVE EXTRACTION
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          Export your transmissions and reflection responses as individual markdown files with
          Obsidian-compatible frontmatter and wiki-link tags. Multiple files arrive bundled as
          a .zip; a single file downloads as raw .md.
        </p>
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
          <span
            className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
            style={{ background: "var(--red)" }}
            aria-hidden
          />
          <p className="text-[10.5px] leading-relaxed text-red">{error}</p>
        </div>
      ) : null}

      {/* Counts */}
      <SectionHeader label="Available for Extraction" className="mb-4" />
      <div className="mb-10 grid gap-3 md:grid-cols-2">
        <CountRow label="Journal Entries" value={journalCount} />
        <CountRow
          label="Reflection Responses"
          value={responseCount}
          sub={
            reflectionWeeks > 0
              ? `Across ${reflectionWeeks} ${reflectionWeeks === 1 ? "cycle" : "cycles"}`
              : undefined
          }
        />
      </div>

      {/* Action grid */}
      <SectionHeader label="Extraction Scope" className="mb-4" />
      <div className="grid gap-4 md:grid-cols-3">
        <ScopeCard
          scope="all"
          title="Full Archive"
          fileCount={totalCount}
          sub="Journal + Reflections"
          accent="var(--phosphor)"
        />
        <ScopeCard
          scope="journal"
          title="Journal Only"
          fileCount={journalCount}
          sub="Freeform Transmissions"
          accent="var(--line)"
        />
        <ScopeCard
          scope="reflections"
          title="Reflections Only"
          fileCount={responseCount}
          sub="Weekly Cycle Responses"
          accent="var(--amber)"
        />
      </div>

      {/* Format notes */}
      <div className="mt-12">
        <SectionHeader label="Format Specification" className="mb-4" />
        <div className="relative border border-line-dim p-5 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
          <CornerMarks />
          <ul className="flex flex-col gap-2">
            <SpecRow label="File Layout">
              One markdown file per artifact. Zip contains <code className="text-amber">journal/</code> and{" "}
              <code className="text-amber">reflections/</code> subdirectories.
            </SpecRow>
            <SpecRow label="Frontmatter">
              YAML — <code className="text-amber">date</code>,{" "}
              <code className="text-amber">type</code>,{" "}
              <code className="text-amber">mood</code> (when set),{" "}
              <code className="text-amber">tags</code> as plain names (when set). Reflections
              also include <code className="text-amber">week</code> and{" "}
              <code className="text-amber">prompt</code>. Reflection{" "}
              <code className="text-amber">date</code> is the week&apos;s Monday — no timezone
              drift.
            </SpecRow>
            <SpecRow label="Index + Wiki-Links">
              Every file has <code className="text-amber">[[journal-index]]</code> or{" "}
              <code className="text-amber">[[reflection-index]]</code> in the body footer, plus
              tags as wiki-links (<code className="text-amber">[[writing]]</code>). They resolve
              in Obsidian&apos;s graph view; the quoted-bracket frontmatter form does not.
            </SpecRow>
            <SpecRow label="Soft-Deleted Items">
              Excluded. Only <code className="text-amber">is_active = true</code> entries,
              reflections, and their responses are exported.
            </SpecRow>
          </ul>
        </div>
      </div>
    </main>
  )
}

function CountRow({
  label,
  value,
  sub,
}: {
  label: string
  value: number
  sub?: string
}) {
  return (
    <div className="relative flex items-center justify-between border border-line-dim px-4 py-3">
      <CornerMarks />
      <div className="flex flex-col gap-1">
        <Label>{label}</Label>
        {sub ? (
          <span className="text-[9px] tracking-[0.08em] text-line-mid">{sub}</span>
        ) : null}
      </div>
      <span
        className="text-[18px] font-light tracking-[0.04em] text-line"
        style={{ color: value > 0 ? "var(--line)" : "var(--line-dim)" }}
      >
        {value}
      </span>
    </div>
  )
}

function ScopeCard({
  scope,
  title,
  fileCount,
  sub,
  accent,
}: {
  scope: "all" | "journal" | "reflections"
  title: string
  fileCount: number
  sub: string
  accent: string
}) {
  const disabled = fileCount === 0
  const downloadKind =
    fileCount === 0 ? "—" : fileCount === 1 ? ".MD" : ".ZIP"

  return (
    <form
      action="/api/export"
      method="POST"
      className="relative block border border-line-dim p-5 transition-colors hover:border-line-mid"
    >
      <CornerMarks />
      <input type="hidden" name="scope" value={scope} />
      <div className="mb-3 flex items-start justify-between">
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-line">
          {title}
        </span>
        <span className="text-[9px] uppercase tracking-[0.08em]" style={{ color: accent }}>
          {downloadKind}
        </span>
      </div>
      <p className="text-[9px] uppercase tracking-[0.08em] text-amber-dim">{sub}</p>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair />
          <span className="text-[10px] tracking-[0.08em] text-line-mid">
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="relative flex items-center gap-2 border border-line-dim px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-dim"
        >
          <span>Extract</span>
          <StatusDot active={!disabled} color={disabled ? "var(--line-dim)" : accent} />
        </button>
      </div>
    </form>
  )
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 border-b border-line-ghost pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-amber-dim sm:w-[140px]">
        {label}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  )
}
