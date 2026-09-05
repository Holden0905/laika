import { createClient } from "@/lib/supabase/server"
import { CornerMarks, Ruler, SectionHeader } from "@/components/ui/schematic"
import { AddTrajectoryForm } from "@/components/trajectories/add-trajectory-form"
import {
  TrajectoryRow,
  type TrajectoryRowData,
} from "@/components/trajectories/trajectory-row"
import { fetchTrajectoryBundle } from "@/lib/trajectories/queries"

type SearchParams = Promise<{ error?: string }>

export default async function TrajectoriesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  let rows: TrajectoryRowData[] = []
  let queryError: string | null = null

  try {
    const bundle = await fetchTrajectoryBundle(supabase)
    rows = bundle.trajectories.map((t) => ({
      id: t.id,
      trajectory_number: bundle.numberById.get(t.id) ?? 0,
      title: t.title,
      summary: t.summary,
      status: t.status,
      last_contact_at: t.last_contact_at,
      log_count: (bundle.logByTrajectory.get(t.id) ?? []).length,
      directive_count: (bundle.directivesByTrajectory.get(t.id) ?? []).length,
    }))
  } catch (err) {
    queryError = err instanceof Error ? err.message : "Trajectory query failed."
  }

  // Least-recently-contacted first inside each bucket — the ones drifting
  // out of range surface at the top, which is the whole point of the module.
  const byContact = (a: TrajectoryRowData, b: TrajectoryRowData) =>
    a.last_contact_at < b.last_contact_at ? -1 : a.last_contact_at > b.last_contact_at ? 1 : 0

  const active = rows.filter((r) => r.status === "ACTIVE").sort(byContact)
  const dormant = rows.filter((r) => r.status === "DORMANT").sort(byContact)
  const archived = rows
    .filter((r) => r.status === "REACHED" || r.status === "ABANDONED")
    .sort((a, b) => (a.last_contact_at < b.last_contact_at ? 1 : -1))

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <SectionHeader label="Trajectories — Long-Horizon Vectors" className="mb-3" />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          TRAJECTORIES
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          {active.length} vector{active.length === 1 ? "" : "s"} under power,{" "}
          {dormant.length} dormant{archived.length > 0 ? `, ${archived.length} archived` : ""}.
          A trajectory is never checked off — it accretes. Log contact to push it forward;
          attach directives when it needs a concrete next step.
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

      {queryError ? (
        <div
          className="mb-6 border border-red/40 px-3 py-2 text-[10.5px] text-red"
          style={{ background: "var(--red-dim)" }}
        >
          Query failed: {queryError}
        </div>
      ) : null}

      <div className="mb-10">
        <AddTrajectoryForm />
      </div>

      <div className="mb-10">
        <SectionHeader label="Under Power — Active Vectors" className="mb-4" />
        {active.length === 0 ? (
          <EmptyState message="No active vectors. Promote a dormant trajectory or seed a new one above." />
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((t) => (
              <TrajectoryRow key={t.id} trajectory={t} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <SectionHeader label="Dormant — In Orbit, Unpowered" className="mb-4" />
        {dormant.length === 0 ? (
          <EmptyState message="Nothing dormant. Every seeded trajectory is under power." />
        ) : (
          <div className="flex flex-col gap-2">
            {dormant.map((t) => (
              <TrajectoryRow key={t.id} trajectory={t} />
            ))}
          </div>
        )}
      </div>

      {archived.length > 0 ? (
        <details className="mb-10 group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber">
            <span
              className="inline-block transition-transform group-open:rotate-90"
              aria-hidden
            >
              ▸
            </span>
            <span>Archive — Reached &amp; Abandoned ({archived.length})</span>
            <span className="ml-1 h-px flex-1 bg-line-ghost" aria-hidden />
          </summary>
          <div className="mt-4 flex flex-col gap-2">
            {archived.map((t) => (
              <TrajectoryRow key={t.id} trajectory={t} />
            ))}
          </div>
        </details>
      ) : null}
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
