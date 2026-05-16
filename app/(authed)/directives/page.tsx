import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
} from "@/components/ui/schematic"
import { AddDirectiveForm } from "@/components/directives/add-directive-form"
import { ManifestExportForm } from "@/components/directives/manifest-export-form"
import {
  DirectiveRow,
  type DirectiveRowData,
} from "@/components/directives/directive-row"

type SearchParams = Promise<{ error?: string }>

type DirectiveRecord = {
  id: string
  title: string
  description: string | null
  is_complete: boolean
  completed_at: string | null
  created_at: string
}

export default async function DirectivesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  // Pull active (non-archived) directives. Order ascending so the directive_number
  // matches creation order and stays stable as items are completed/reopened.
  const { data, error: queryError } = await supabase
    .from("tasks")
    .select("id, title, description, is_complete, completed_at, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  const records = (data as DirectiveRecord[] | null) ?? []
  const rows: DirectiveRowData[] = records.map((d, i) => ({
    id: d.id,
    directive_number: i + 1,
    title: d.title,
    description: d.description,
    is_complete: d.is_complete,
    completed_at: d.completed_at,
    created_at: d.created_at,
  }))

  const active = rows.filter((r) => !r.is_complete)
  // Newest completion first feels more useful in the archive view than chronological.
  const complete = rows
    .filter((r) => r.is_complete)
    .sort((a, b) => {
      const ax = a.completed_at ?? ""
      const bx = b.completed_at ?? ""
      return ax < bx ? 1 : ax > bx ? -1 : 0
    })

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <SectionHeader label="Queued Directives — Task Manifest" className="mb-3" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
              QUEUED DIRECTIVES
            </h1>
            <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
              {active.length} pending directive{active.length === 1 ? "" : "s"} awaiting
              execution{complete.length > 0 ? `, ${complete.length} completed on file` : ""}.
              Mark complete to log; archive to remove from the manifest. Both pending and
              completed directives are extractable as an Obsidian checklist via the export
              terminal.
            </p>
          </div>
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
          <span
            className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
            style={{ background: "var(--red)" }}
            aria-hidden
          />
          <p className="text-[10.5px] leading-relaxed text-red">{error}</p>
        </div>
      ) : null}

      {queryError ? (
        <div
          className="border border-red/40 px-3 py-2 text-[10.5px] text-red"
          style={{ background: "var(--red-dim)" }}
        >
          Query failed: {queryError.message}
        </div>
      ) : null}

      <div className="mb-10">
        <AddDirectiveForm />
      </div>

      <div className="mb-10">
        <SectionHeader label="Active Queue — Awaiting Execution" className="mb-4" />
        {active.length === 0 ? (
          <EmptyState message="Queue is clear. Add a directive above to begin." />
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((d) => (
              <DirectiveRow key={d.id} directive={d} />
            ))}
          </div>
        )}
      </div>

      {complete.length > 0 ? (
        <div className="mb-10">
          <SectionHeader label="Completed — Archive Log" className="mb-4" />
          <div className="flex flex-col gap-2">
            {complete.map((d) => (
              <DirectiveRow key={d.id} directive={d} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-10">
        <SectionHeader label="Manifest Extraction — Brozosphere" className="mb-4" />
        <ManifestExportForm
          pendingCount={active.length}
          completedCount={complete.length}
        />
      </div>
    </main>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="relative border border-line-dim px-6 py-10 text-center">
      <CornerMarks />
      <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">No Signal</p>
      <p className="mt-3 text-[11px] tracking-[0.04em] text-line-mid">{message}</p>
    </div>
  )
}
