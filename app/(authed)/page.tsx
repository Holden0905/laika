import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  CheckIndicator,
  CornerMarks,
  Crosshair,
  Label,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { EntryCard, type EntryCardData } from "@/components/journal/entry-card"
import { ReflectionProgressBar } from "@/components/reflections/progress-bar"
import { BleedBackground } from "@/components/bleed-background"
import { DeepSpacePing } from "@/components/trajectories/deep-space-ping"
import { fetchTrajectoryPing } from "@/lib/trajectories/queries"
import { currentIsoWeek, formatWeekRange } from "@/lib/reflections/format"
import {
  classifySatellite,
  padPromptNumber,
  type SatelliteStatus,
} from "@/lib/prompts/format"
import {
  averageMood,
  build14DayMoodArray,
  computeStreak,
} from "@/lib/journal/stats"

type EntryRow = {
  id: string
  title: string | null
  body: string
  mood: number | null
  entry_date: string
  entry_number: number
  entry_tags: Array<{ tags: { name: string } | null }> | null
}

type StatsEntryRow = { entry_date: string; mood: number | null }

type PromptRow = {
  id: string
  text: string
  is_active: boolean
  created_at: string
  reflection_prompts: Array<{ reflection_id: string }> | null
}

type ReflectionData = {
  id: string
  week_start: string
  reflection_prompts: Array<{
    prompt_id: string
    prompts: { id: string; text: string; is_active: boolean } | null
  }> | null
  reflection_responses: Array<{ id: string; prompt_id: string }> | null
}

type SatelliteRow = {
  id: string
  text: string
  weeks_used: number
  status: SatelliteStatus
}

function flattenTags(rows: EntryRow["entry_tags"]): string[] {
  if (!rows) return []
  return rows
    .map((r) => r.tags?.name)
    .filter((n): n is string => Boolean(n))
    .sort()
}

export default async function Home() {
  const supabase = await createClient()
  const thisWeek = currentIsoWeek()
  const now = new Date()

  const [
    recentRes,
    statsEntriesRes,
    currentReflectionRes,
    promptsRes,
    exportCountRes,
    pingTrajectory,
  ] = await Promise.all([
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
      .eq("is_active", true)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("entries")
      .select("entry_date, mood")
      .eq("is_active", true),
    supabase
      .from("weekly_reflections")
      .select(
        `
        id,
        week_start,
        reflection_prompts ( prompt_id, prompts ( id, text, is_active ) ),
        reflection_responses ( id, prompt_id )
        `
      )
      .eq("year", thisWeek.year)
      .eq("week_number", thisWeek.week)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("prompts")
      .select("id, text, is_active, created_at, reflection_prompts ( reflection_id )")
      .order("created_at", { ascending: true }),
    supabase
      .from("exports")
      .select("*", { count: "exact", head: true }),
    fetchTrajectoryPing(supabase, now),
  ])

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const recentEntries: EntryCardData[] =
    (recentRes.data as unknown as EntryRow[] | null)?.map((row) => ({
      id: row.id,
      entry_number: row.entry_number,
      title: row.title,
      body: row.body,
      entry_date: row.entry_date,
      mood: row.mood,
      tags: flattenTags(row.entry_tags),
    })) ?? []

  const statsEntries = (statsEntriesRes.data as StatsEntryRow[] | null) ?? []
  const totalEntries = statsEntries.length
  const streak = computeStreak(
    statsEntries.map((e) => e.entry_date),
    now
  )
  const moodArray = build14DayMoodArray(statsEntries, now)
  const avgMood = averageMood(statsEntries)
  const exportCount = exportCountRes.count ?? 0

  const reflection = currentReflectionRes.data as unknown as ReflectionData | null
  const allPrompts = (promptsRes.data as PromptRow[] | null) ?? []
  const promptNumberById = new Map(allPrompts.map((p, i) => [p.id, i + 1]))

  // Active satellites — top by weeks used, then most recent. Limited to 7 to match mockup.
  const satellites: SatelliteRow[] = allPrompts
    .filter((p) => p.is_active)
    .map((p) => {
      const weeksUsed = p.reflection_prompts?.length ?? 0
      return {
        id: p.id,
        text: p.text,
        weeks_used: weeksUsed,
        status: classifySatellite({ weeksUsed, createdAt: p.created_at, now }),
      }
    })
    .sort((a, b) => b.weeks_used - a.weeks_used)
    .slice(0, 7)

  let reflectionView: {
    id: string
    weekRange: string
    answered: number
    total: number
    rows: Array<{ promptId: string; number: number; text: string; answered: boolean }>
  } | null = null

  if (reflection) {
    const answeredSet = new Set(
      (reflection.reflection_responses ?? []).map((r) => r.prompt_id)
    )
    const picks = (reflection.reflection_prompts ?? []).filter((p) => p.prompts !== null)
    const rows = picks
      .map((p) => ({
        promptId: p.prompt_id,
        number: promptNumberById.get(p.prompt_id) ?? 0,
        text: p.prompts!.text,
        answered: answeredSet.has(p.prompt_id),
      }))
      .sort((a, b) => a.number - b.number)

    reflectionView = {
      id: reflection.id,
      weekRange: formatWeekRange(reflection.week_start),
      answered: rows.filter((r) => r.answered).length,
      total: rows.length,
      rows,
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      <BleedBackground variant="impact" />
      {/* Header — daily prompt */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Crosshair />
          <Label>Daily Inscription</Label>
        </div>
        <h1 className="text-[20px] font-light italic leading-snug tracking-[0.02em] text-line sm:text-[24px]">
          “The limits of my language means the limits of my world.”
        </h1>
        <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-amber-dim">
          — Ludwig Wittgenstein
        </p>
        <div className="mt-4">
          <Ruler count={40} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <ActionCard
          href="/journal/new"
          title="New Entry"
          sub="Freeform Transmission"
          status="Ready"
          statusColor="var(--phosphor)"
        />
        <ActionCard
          href={reflectionView ? `/reflections/${reflectionView.id}` : "/reflections/new"}
          title="Weekly Reflection"
          sub={
            reflectionView
              ? `Cycle in Progress — ${thisWeek.isoString}`
              : `Begin Cycle — ${thisWeek.isoString}`
          }
          status={
            reflectionView
              ? `${reflectionView.answered} / ${reflectionView.total}`
              : "Ready"
          }
          statusColor={
            reflectionView && reflectionView.answered >= reflectionView.total
              ? "var(--phosphor)"
              : reflectionView
                ? "var(--amber)"
                : "var(--phosphor)"
          }
        />
      </div>

      {/* Two-column body */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── LEFT: Transmission log ───────────────────────────────────── */}
        <div>
          <div className="mb-4">
            <SectionHeader label="Transmission Log — Recent" />
          </div>
          {recentEntries.length === 0 ? (
            <EmptyPanel
              title="No Signal"
              body="Log is empty. Transmit your first entry to begin the cycle."
              cta={{ href: "/journal/new", label: "+ New Entry" }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {recentEntries.map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </div>
              {totalEntries > recentEntries.length ? (
                <div className="mt-4 flex justify-end">
                  <Link
                    href="/journal"
                    className="text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber"
                  >
                    View All {totalEntries} →
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ─── RIGHT: Reflection cycle + Diagnostics + Satellites ───────── */}
        <div className="flex flex-col gap-8">
          {/* Reflection cycle */}
          <section>
            <div className="mb-4">
              <SectionHeader label={`Reflection Cycle — ${thisWeek.isoString}`} />
            </div>
            {reflectionView === null ? (
              <EmptyPanel
                title="No Cycle Active"
                body="The current week has no active reflection. Initiate a cycle to begin tracking weekly satellites."
                cta={{ href: "/reflections/new", label: "+ Initiate Cycle" }}
              />
            ) : (
              <Link
                href={`/reflections/${reflectionView.id}`}
                className="relative block border border-line-dim p-5 transition-colors hover:border-line-mid"
              >
                <CornerMarks />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Label>{reflectionView.weekRange}</Label>
                  <span
                    className="text-[13px] font-semibold tracking-[0.04em]"
                    style={{
                      color:
                        reflectionView.answered >= reflectionView.total
                          ? "var(--phosphor)"
                          : "var(--line)",
                    }}
                  >
                    {reflectionView.answered} / {reflectionView.total}
                  </span>
                </div>
                <div className="flex flex-col">
                  {reflectionView.rows.map((row) => (
                    <div
                      key={row.promptId}
                      className="flex items-start gap-3 border-b border-line-ghost py-2 last:border-b-0"
                    >
                      <CheckIndicator checked={row.answered} className="mt-[2px]" />
                      <p
                        className={`flex-1 text-[11px] leading-snug tracking-[0.02em] ${
                          row.answered
                            ? "text-line-mid line-through decoration-line-ghost"
                            : "text-line"
                        }`}
                      >
                        {row.text}
                      </p>
                      <span className="shrink-0 text-[9px] tracking-[0.08em] text-amber-dim">
                        P-{padPromptNumber(row.number)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <ReflectionProgressBar
                    answered={reflectionView.answered}
                    total={reflectionView.total}
                  />
                </div>
              </Link>
            )}
          </section>

          {/* Deep space ping — hidden entirely when nothing is in play. */}
          {pingTrajectory ? (
            <section>
              <div className="mb-4">
                <SectionHeader label="Deep Space Ping — Long-Horizon Vector" />
              </div>
              <DeepSpacePing trajectory={pingTrajectory} />
            </section>
          ) : null}

          {/* System diagnostics */}
          <section>
            <div className="mb-4">
              <SectionHeader label="System Diagnostics" />
            </div>
            <div className="relative border border-line-dim p-5">
              <CornerMarks />
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Mood 14-day array */}
                <div className="flex flex-col gap-2">
                  <Label>Mood — 14 Day Array</Label>
                  <MoodChart values={moodArray} />
                  <div className="flex justify-between">
                    <span className="text-[8px] tracking-[0.08em] text-amber-dim">-14D</span>
                    <span className="text-[8px] tracking-[0.08em] text-amber-dim">NOW</span>
                  </div>
                </div>

                {/* Power output */}
                <div className="flex flex-col gap-2">
                  <Label>Power Output</Label>
                  <div className="mt-1 flex flex-col">
                    <StatRow
                      label="Avg Mood"
                      value={avgMood === null ? "—" : `${avgMood.toFixed(1)} / 5.0`}
                    />
                    <StatRow label="Entries" value={String(totalEntries)} />
                    <StatRow
                      label="Streak"
                      value={`${streak} ${streak === 1 ? "DAY" : "DAYS"}`}
                      valueColor={streak > 0 ? "var(--phosphor)" : "var(--line)"}
                    />
                    <StatRow label="Exports" value={String(exportCount)} last />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Active satellites */}
          <section>
            <div className="mb-4">
              <SectionHeader label="Active Satellites — Orbit Status" />
            </div>
            {satellites.length === 0 ? (
              <EmptyPanel
                title="No Satellites in Orbit"
                body="Launch your first prompt from the Prompt Library to begin charting orbits."
                cta={{ href: "/prompts", label: "+ Launch Satellite" }}
              />
            ) : (
              <div className="flex flex-col">
                {satellites.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 border-b border-line-ghost py-2 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusDot
                        active
                        color={s.status === "NEW" ? "var(--amber)" : "var(--phosphor)"}
                      />
                      <span className="truncate text-[10px] uppercase tracking-[0.08em] text-line">
                        {s.text}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[9px] tracking-[0.08em] text-amber-dim">
                        {s.weeks_used}W
                      </span>
                      <span
                        className="border px-[5px] py-[1px] text-[8px] tracking-[0.08em]"
                        style={{
                          color:
                            s.status === "NEW" ? "var(--amber)" : "var(--amber-dim)",
                          borderColor:
                            s.status === "NEW" ? "var(--amber-dim)" : "var(--line-ghost)",
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

// ─── Components ──────────────────────────────────────────────────────────────

function ActionCard({
  href,
  title,
  sub,
  status,
  statusColor,
}: {
  href: string
  title: string
  sub: string
  status: string
  statusColor: string
}) {
  return (
    <Link
      href={href}
      className="relative block border border-line-dim p-5 transition-colors hover:border-line-mid"
    >
      <CornerMarks />
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-line">
          {title}
        </span>
        <span
          className="text-[9px] uppercase tracking-[0.08em]"
          style={{ color: statusColor }}
        >
          {status}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-[0.08em] text-amber-dim">{sub}</span>
    </Link>
  )
}

function EmptyPanel({
  title,
  body,
  cta,
}: {
  title: string
  body: string
  cta?: { href: string; label: string }
}) {
  return (
    <div className="relative border border-line-dim px-6 py-10 text-center">
      <CornerMarks />
      <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">{title}</p>
      <p className="mt-3 text-[11px] leading-relaxed tracking-[0.04em] text-line-mid">{body}</p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-2 border border-line-dim px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid"
        >
          {cta.label} <StatusDot active />
        </Link>
      ) : null}
    </div>
  )
}

/**
 * 14-bar mood chart. Index 0 = 13 days ago, index 13 = today.
 * Filled bars (mood >= 4) are phosphor; lower bars are line-on-dim-opacity;
 * null days render as a faint placeholder so the timeline reads as continuous.
 */
function MoodChart({ values }: { values: Array<number | null> }) {
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {values.map((v, i) => {
        const isNull = v === null
        const value = v ?? 0
        const filled = !isNull && value >= 4
        const heightPct = isNull ? 100 : Math.max((value / 5) * 100, 8)
        return (
          <span
            key={i}
            className="flex-1"
            style={{
              height: `${heightPct}%`,
              background: isNull
                ? "var(--line-ghost)"
                : filled
                  ? "var(--phosphor)"
                  : "var(--line)",
              opacity: isNull ? 1 : filled ? 0.65 : 0.15 + (value / 5) * 0.3,
            }}
          />
        )
      })}
    </div>
  )
}

function StatRow({
  label,
  value,
  valueColor = "var(--line)",
  last = false,
}: {
  label: string
  value: string
  valueColor?: string
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-[5px] ${last ? "" : "border-b border-line-ghost"}`}
    >
      <Label>{label}</Label>
      <span className="text-[10px] tracking-[0.04em]" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  )
}
