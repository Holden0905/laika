import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
} from "@/components/ui/schematic"
import {
  fetchExportedArtifacts,
  fetchJournalEntriesForExport,
  fetchReflectionResponsesForExport,
} from "@/lib/export/queries"
import {
  ExportPicker,
  type PickerEntry,
  type PickerResponse,
  type PickerTrajectory,
} from "@/components/export/picker"
import { fetchTrajectoryBundle } from "@/lib/trajectories/queries"

type SearchParams = Promise<{ error?: string }>

export default async function ExportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [entries, responses, exported, trajectoryBundle] = await Promise.all([
    fetchJournalEntriesForExport(supabase),
    fetchReflectionResponsesForExport(supabase),
    fetchExportedArtifacts(supabase),
    fetchTrajectoryBundle(supabase),
  ])

  // Sort newest-first for the picker. Underlying query returns ascending so
  // markdown filenames generate in chronological order; the picker is the
  // reverse so the most recent work is at the top of the scroll.
  const pickerEntries: PickerEntry[] = [...entries]
    .sort((a, b) => (a.entry_date < b.entry_date ? 1 : a.entry_date > b.entry_date ? -1 : 0))
    .map((e) => ({
      id: e.id,
      entry_number: e.entry_number,
      title: e.title,
      body: e.body,
      entry_date: e.entry_date,
      mood: e.mood,
      exported_at: exported.entries.get(e.id) ?? null,
    }))

  const pickerResponses: PickerResponse[] = responses.map((r) => ({
    id: r.response_id,
    prompt_text: r.prompt_text,
    prompt_number: r.prompt_number,
    body: r.body,
    reflection_year: r.reflection_year,
    reflection_week_number: r.reflection_week_number,
    reflection_week_start: r.reflection_week_start,
    exported_at: exported.responses.get(r.response_id) ?? null,
  }))

  // Creation order in the list, same as the T-### numbering.
  const pickerTrajectories: PickerTrajectory[] = trajectoryBundle.trajectories.map((t) => ({
    id: t.id,
    trajectory_number: trajectoryBundle.numberById.get(t.id) ?? 0,
    title: t.title,
    summary: t.summary,
    status: t.status,
    log_count: (trajectoryBundle.logByTrajectory.get(t.id) ?? []).length,
    directive_count: (trajectoryBundle.directivesByTrajectory.get(t.id) ?? []).length,
    exported_at: exported.trajectories.get(t.id) ?? null,
  }))

  const unexportedCount =
    pickerEntries.filter((e) => !e.exported_at).length +
    pickerResponses.filter((r) => !r.exported_at).length +
    pickerTrajectories.filter((t) => !t.exported_at).length
  const totalCount =
    pickerEntries.length + pickerResponses.length + pickerTrajectories.length
  const exportedCount = totalCount - unexportedCount

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <SectionHeader label="Brozosphere Export — Extraction" className="mb-3" />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          ARCHIVE EXTRACTION
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          Select the transmissions, reflection responses, and trajectories to extract. Each
          artifact downloads as an Obsidian-compatible{" "}
          <code className="text-amber">.md</code> file with frontmatter and wiki-link tags;
          multi-file extractions arrive as a <code className="text-amber">.zip</code> with{" "}
          <code className="text-amber">journal/</code>,{" "}
          <code className="text-amber">reflections/</code>, and{" "}
          <code className="text-amber">trajectories/</code> subdirectories.
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

      <SectionHeader label="Diagnostics" className="mb-4" />
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <DiagnosticCell label="New / Unexported" value={unexportedCount} accent="var(--phosphor)" />
        <DiagnosticCell label="Previously Extracted" value={exportedCount} accent="var(--amber)" />
        <DiagnosticCell label="Total On File" value={totalCount} accent="var(--line)" />
      </div>

      <ExportPicker
        entries={pickerEntries}
        responses={pickerResponses}
        trajectories={pickerTrajectories}
      />

      <div className="mt-12">
        <SectionHeader label="Format Specification" className="mb-4" />
        <div className="relative border border-line-dim p-5 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
          <CornerMarks />
          <ul className="flex flex-col gap-2">
            <SpecRow label="File Layout">
              One markdown file per artifact. Zip contains{" "}
              <code className="text-amber">journal/</code>,{" "}
              <code className="text-amber">reflections/</code>, and{" "}
              <code className="text-amber">trajectories/</code> subdirectories.
            </SpecRow>
            <SpecRow label="Frontmatter">
              YAML — <code className="text-amber">date</code>,{" "}
              <code className="text-amber">type</code>,{" "}
              <code className="text-amber">mood</code> (when set),{" "}
              <code className="text-amber">tags</code> as plain names (when set). Reflections
              also include <code className="text-amber">week</code> and{" "}
              <code className="text-amber">prompt</code>; trajectories include{" "}
              <code className="text-amber">status</code>.
            </SpecRow>
            <SpecRow label="Index + Wiki-Links">
              Every file has <code className="text-amber">[[journal-index]]</code>,{" "}
              <code className="text-amber">[[reflection-index]]</code>, or{" "}
              <code className="text-amber">[[trajectory-index]]</code> in the body footer, plus
              tags as wiki-links.
            </SpecRow>
            <SpecRow label="Trajectory Body">
              H1 title, summary, then{" "}
              <code className="text-amber">## Log</code> with each entry as a dated{" "}
              <code className="text-amber">### YYYY-MM-DD</code> section (newest first), then{" "}
              <code className="text-amber">## Directives</code> as a checklist.
            </SpecRow>
            <SpecRow label="Export Log">
              Extracting an artifact stamps it in{" "}
              <code className="text-amber">exports_log</code>. The picker defaults to selecting
              only unstamped artifacts; the{" "}
              <code className="text-amber">EXPORTED</code> badge shows the most recent
              extraction date for items already stamped.
            </SpecRow>
          </ul>
        </div>
      </div>
    </main>
  )
}

function DiagnosticCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="relative flex items-center justify-between border border-line-dim px-4 py-3">
      <CornerMarks />
      <span className="text-[9px] uppercase tracking-[0.14em] text-amber-dim">
        {label}
      </span>
      <span
        className="text-[18px] font-light tracking-[0.04em]"
        style={{ color: value > 0 ? accent : "var(--line-dim)" }}
      >
        {value}
      </span>
    </div>
  )
}

function SpecRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <li className="flex flex-col gap-1 border-b border-line-ghost pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-amber-dim sm:w-[140px]">
        {label}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  )
}
