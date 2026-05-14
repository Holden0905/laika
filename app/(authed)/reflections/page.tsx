import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { ReflectionProgressBar } from "@/components/reflections/progress-bar"
import {
  formatWeekLabel,
  formatWeekRange,
} from "@/lib/reflections/format"

type SearchParams = Promise<{ error?: string }>

type ReflectionRow = {
  id: string
  week_start: string
  week_number: number
  year: number
  reflection_prompts: Array<{ prompt_id: string }> | null
  reflection_responses: Array<{ id: string }> | null
}

export default async function ReflectionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data, error: queryError } = await supabase
    .from("weekly_reflections")
    .select(
      `
      id,
      week_start,
      week_number,
      year,
      reflection_prompts ( prompt_id ),
      reflection_responses ( id )
      `
    )
    .eq("is_active", true)
    .order("year", { ascending: false })
    .order("week_number", { ascending: false })

  const reflections = (data as ReflectionRow[] | null) ?? []

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader label="Reflection Cycle — Archive" className="mb-3" />
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
              REFLECTION CYCLES
            </h1>
            <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
              {reflections.length === 0
                ? "No cycles initiated. Begin first weekly reflection to populate the archive."
                : `${reflections.length} cycle${reflections.length === 1 ? "" : "s"} on file. Sorted by week.`}
            </p>
          </div>
          <Link
            href="/reflections/new"
            className="relative flex w-full items-center justify-between gap-3 border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid sm:w-auto sm:justify-start"
          >
            <CornerMarks />
            <span>+ New Reflection</span>
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
      ) : reflections.length === 0 ? (
        <div className="relative border border-line-dim px-6 py-12 text-center">
          <CornerMarks />
          <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">No Signal</p>
          <p className="mt-3 text-[11px] tracking-[0.04em] text-line-mid">
            Begin first weekly reflection to populate the archive.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reflections.map((r) => {
            const total = r.reflection_prompts?.length ?? 0
            const answered = r.reflection_responses?.length ?? 0
            const complete = total > 0 && answered >= total
            return (
              <Link
                key={r.id}
                href={`/reflections/${r.id}`}
                className="relative block border border-line-dim px-5 py-4 transition-colors hover:border-line-mid"
              >
                <CornerMarks />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-amber-dim">
                      {formatWeekLabel(r.year, r.week_number)}
                    </p>
                    <h3 className="mt-1 text-[13px] font-semibold leading-snug tracking-[0.04em] text-line">
                      {formatWeekRange(r.week_start)}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className="text-[11px] font-semibold tracking-[0.04em]"
                      style={{ color: complete ? "var(--phosphor)" : "var(--line)" }}
                    >
                      {answered} / {total}
                    </span>
                    <StatusDot
                      active={complete}
                      color={complete ? "var(--phosphor)" : "var(--amber)"}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <ReflectionProgressBar answered={answered} total={total} showLabel={false} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
