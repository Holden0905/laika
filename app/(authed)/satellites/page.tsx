import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Label,
  Ruler,
  SectionHeader,
} from "@/components/ui/schematic"
import { TimelineGrid, type TimelineRow, type TimelineWeek } from "@/components/satellites/timeline-grid"
import {
  SatelliteRow,
  type SatelliteRowData,
  type OrbitEvent,
} from "@/components/satellites/satellite-row"
import { padPromptNumber } from "@/lib/prompts/format"
import { classifyTrajectory } from "@/lib/satellites/classify"

type PromptRow = {
  id: string
  text: string
  is_active: boolean
  created_at: string
}

type ReflectionRow = {
  id: string
  year: number
  week_number: number
  week_start: string
}

type PickRow = { reflection_id: string; prompt_id: string }
type ResponseRow = { reflection_id: string; prompt_id: string }

const TIMELINE_WINDOW_WEEKS = 20

export default async function SatellitesPage() {
  const supabase = await createClient()
  const now = new Date()

  const [promptsRes, reflectionsRes, picksRes, responsesRes] = await Promise.all([
    supabase
      .from("prompts")
      .select("id, text, is_active, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("weekly_reflections")
      .select("id, year, week_number, week_start")
      .eq("is_active", true)
      .order("year", { ascending: true })
      .order("week_number", { ascending: true }),
    supabase.from("reflection_prompts").select("reflection_id, prompt_id"),
    supabase.from("reflection_responses").select("reflection_id, prompt_id"),
  ])

  if (
    promptsRes.error ||
    reflectionsRes.error ||
    picksRes.error ||
    responsesRes.error
  ) {
    const msg =
      promptsRes.error?.message ??
      reflectionsRes.error?.message ??
      picksRes.error?.message ??
      responsesRes.error?.message ??
      "Query failed."
    return (
      <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-red">Query failed: {msg}</p>
      </main>
    )
  }

  const prompts = (promptsRes.data as PromptRow[] | null) ?? []
  const reflectionsAsc = (reflectionsRes.data as ReflectionRow[] | null) ?? []
  const picks = (picksRes.data as PickRow[] | null) ?? []
  const responses = (responsesRes.data as ResponseRow[] | null) ?? []

  const reflectionById = new Map(reflectionsAsc.map((r) => [r.id, r]))

  // picks per prompt → Set of reflection ids
  const picksByPromptId = new Map<string, Set<string>>()
  for (const p of picks) {
    let set = picksByPromptId.get(p.prompt_id)
    if (!set) {
      set = new Set()
      picksByPromptId.set(p.prompt_id, set)
    }
    set.add(p.reflection_id)
  }

  // answered per prompt → Set of reflection ids
  const answeredByPromptId = new Map<string, Set<string>>()
  for (const r of responses) {
    let set = answeredByPromptId.get(r.prompt_id)
    if (!set) {
      set = new Set()
      answeredByPromptId.set(r.prompt_id, set)
    }
    set.add(r.reflection_id)
  }

  // Per-satellite aggregation
  type Satellite = SatelliteRowData & { createdAt: string; responseRate: number | null }
  const satellites: Satellite[] = prompts.map((p, i) => {
    const pickSet = picksByPromptId.get(p.id) ?? new Set<string>()
    const answeredSet = answeredByPromptId.get(p.id) ?? new Set<string>()

    const selections: OrbitEvent[] = Array.from(pickSet)
      .map((reflId): OrbitEvent | null => {
        const refl = reflectionById.get(reflId)
        if (!refl) return null
        return {
          reflectionId: reflId,
          year: refl.year,
          week_number: refl.week_number,
          week_start: refl.week_start,
          answered: answeredSet.has(reflId),
        }
      })
      .filter((s): s is OrbitEvent => s !== null)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.week_number - a.week_number
      })

    const status = classifyTrajectory({
      isActive: p.is_active,
      createdAt: p.created_at,
      selectionWeekStarts: selections.map((s) => s.week_start),
      now,
    })

    const weeksUsed = selections.length
    const timesAnswered = selections.filter((s) => s.answered).length

    return {
      id: p.id,
      number: i + 1,
      text: p.text,
      isActive: p.is_active,
      status,
      weeksUsed,
      timesAnswered,
      selections,
      createdAt: p.created_at,
      responseRate: weeksUsed > 0 ? timesAnswered / weeksUsed : null,
    }
  })

  const active = satellites.filter((s) => s.isActive)
  const decommissioned = satellites.filter((s) => !s.isActive)

  // Stats
  const longestRunning = [...active]
    .filter((s) => s.weeksUsed > 0)
    .sort((a, b) => b.weeksUsed - a.weeksUsed)[0]
  const highestResponse = [...active]
    .filter((s) => s.weeksUsed > 0)
    .sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0))[0]

  // Timeline: last N reflections, oldest → newest (so axis reads left to right chronologically)
  const timelineReflections = reflectionsAsc.slice(-TIMELINE_WINDOW_WEEKS)
  const timelineWeeks: TimelineWeek[] = timelineReflections.map((r) => ({
    reflectionId: r.id,
    year: r.year,
    week_number: r.week_number,
  }))
  const timelineRows: TimelineRow[] = satellites.map((sat) => ({
    promptId: sat.id,
    promptNumber: sat.number,
    promptText: sat.text,
    status: sat.status,
    cells: timelineWeeks.map((w) => ({
      selected: picksByPromptId.get(sat.id)?.has(w.reflectionId) ?? false,
      answered: answeredByPromptId.get(sat.id)?.has(w.reflectionId) ?? false,
    })),
  }))

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader label="Mission Control — Satellite Curation" className="mb-3" />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          ACTIVE SATELLITES
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          Full fleet status and orbit history. Trajectories compare selection volume in the last
          4 weeks against the prior 4 weeks. Curate the satellites that keep your important life
          domains in orbit.
        </p>
        <div className="mt-4">
          <Ruler count={40} />
        </div>
      </div>

      {/* Summary stats */}
      <SectionHeader label="Fleet Telemetry" className="mb-4" />
      <div className="mb-10 grid gap-3 md:grid-cols-4">
        <StatCard label="Active Satellites" value={String(active.length)} />
        <StatCard
          label="Decommissioned"
          value={String(decommissioned.length)}
          valueColor="var(--line-mid)"
        />
        <StatCard
          label="Longest-Running"
          value={
            longestRunning
              ? `P-${padPromptNumber(longestRunning.number)} · ${longestRunning.weeksUsed}W`
              : "—"
          }
          sub={longestRunning?.text}
          valueColor="var(--phosphor)"
        />
        <StatCard
          label="Highest Response Rate"
          value={
            highestResponse
              ? `P-${padPromptNumber(highestResponse.number)} · ${Math.round((highestResponse.responseRate ?? 0) * 100)}%`
              : "—"
          }
          sub={highestResponse?.text}
          valueColor="var(--phosphor)"
        />
      </div>

      {/* Timeline grid */}
      <SectionHeader label="Timeline · Orbit Pattern Map" className="mb-4" />
      <div className="mb-10">
        <TimelineGrid weeks={timelineWeeks} rows={timelineRows} />
      </div>

      {/* Active fleet */}
      <SectionHeader label="Active Fleet · In Orbit" className="mb-4" />
      <div className="mb-10">
        {active.length === 0 ? (
          <EmptyPanel
            title="No Active Satellites"
            body="Launch prompts from the library to begin charting orbits."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((sat) => (
              <SatelliteRow key={sat.id} sat={sat} />
            ))}
          </div>
        )}
      </div>

      {/* Decommissioned fleet */}
      {decommissioned.length > 0 ? (
        <div className="mb-10">
          <SectionHeader
            label="Decommissioned · Preserved On File"
            className="mb-4"
          />
          <div className="flex flex-col gap-2 opacity-80">
            {decommissioned.map((sat) => (
              <SatelliteRow key={sat.id} sat={sat} />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  )
}

function StatCard({
  label,
  value,
  sub,
  valueColor = "var(--line)",
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="relative border border-line-dim p-4">
      <CornerMarks />
      <Label>{label}</Label>
      <div
        className="mt-2 text-[14px] font-semibold tracking-[0.04em]"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {sub ? (
        <p className="mt-2 truncate text-[9px] tracking-[0.04em] text-line-mid">{sub}</p>
      ) : null}
    </div>
  )
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative border border-line-dim px-6 py-10 text-center">
      <CornerMarks />
      <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">{title}</p>
      <p className="mt-3 text-[11px] leading-relaxed tracking-[0.04em] text-line-mid">{body}</p>
    </div>
  )
}
