import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { ReflectionProgressBar } from "@/components/reflections/progress-bar"
import {
  ResponseEditor,
  type ExistingResponse,
} from "@/components/reflections/response-editor"
import { TerminateReflectionButton } from "@/components/reflections/terminate-reflection-button"
import {
  formatWeekLabel,
  formatWeekRange,
} from "@/lib/reflections/format"
import { saveResponse } from "../actions"

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ error?: string; warning?: string }>

type ReflectionRow = {
  id: string
  week_start: string
  week_number: number
  year: number
}

type PickRow = {
  prompt_id: string
  prompts: { id: string; text: string; is_active: boolean } | null
}

type ResponseRow = {
  id: string
  prompt_id: string
  body: string
  mood: number | null
  response_tags: Array<{ tags: { name: string } | null }> | null
}

type PromptIdRow = { id: string; created_at: string }

export default async function ReflectionDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const { error, warning } = await searchParams
  const supabase = await createClient()

  const [reflectionRes, allPromptsRes, picksRes, responsesRes] = await Promise.all([
    supabase
      .from("weekly_reflections")
      .select("id, week_start, week_number, year")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("prompts")
      .select("id, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("reflection_prompts")
      .select("prompt_id, prompts ( id, text, is_active )")
      .eq("reflection_id", id),
    supabase
      .from("reflection_responses")
      .select(
        `
        id,
        prompt_id,
        body,
        mood,
        response_tags ( tags ( name ) )
        `
      )
      .eq("reflection_id", id),
  ])

  if (reflectionRes.error) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-red">Query failed: {reflectionRes.error.message}</p>
      </main>
    )
  }
  if (!reflectionRes.data) notFound()

  const reflection = reflectionRes.data as ReflectionRow

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const picks = (picksRes.data as unknown as PickRow[] | null) ?? []
  const responses = (responsesRes.data as unknown as ResponseRow[] | null) ?? []
  const allPrompts = (allPromptsRes.data as PromptIdRow[] | null) ?? []

  const promptNumberById = new Map(allPrompts.map((p, i) => [p.id, i + 1]))

  const responseByPromptId = new Map<string, ExistingResponse>(
    responses.map((r) => [
      r.prompt_id,
      {
        id: r.id,
        body: r.body,
        mood: r.mood,
        tags:
          r.response_tags
            ?.map((rt) => rt.tags?.name)
            .filter((n): n is string => Boolean(n))
            .sort() ?? [],
      },
    ])
  )

  // Order picks by prompt_number for stability.
  const orderedPicks = [...picks]
    .filter((p) => p.prompts !== null)
    .sort(
      (a, b) =>
        (promptNumberById.get(a.prompt_id) ?? 0) -
        (promptNumberById.get(b.prompt_id) ?? 0)
    )

  const total = orderedPicks.length
  const answered = orderedPicks.filter((p) => responseByPromptId.has(p.prompt_id)).length
  const complete = total > 0 && answered >= total

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          label={`${formatWeekLabel(reflection.year, reflection.week_number)} · Detail`}
          className="mb-3"
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
            {formatWeekRange(reflection.week_start)}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-[13px] font-semibold tracking-[0.04em]"
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
          <ReflectionProgressBar answered={answered} total={total} />
        </div>
        <div className="mt-4">
          <Ruler count={32} />
        </div>
      </div>

      {error ? (
        <Alert kind="error" message={error} />
      ) : null}
      {warning ? (
        <Alert kind="warning" message={warning} />
      ) : null}

      {/* Response editors */}
      <div className="mb-10 flex flex-col gap-4">
        {orderedPicks.length === 0 ? (
          <div className="relative border border-line-dim px-6 py-10 text-center">
            <CornerMarks />
            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">No Prompts Picked</p>
            <p className="mt-3 text-[11px] tracking-[0.04em] text-line-mid">
              This cycle has no prompts in scope. Terminate it and create a new one.
            </p>
          </div>
        ) : (
          orderedPicks.map((pick) => {
            const prompt = pick.prompts!
            const num = promptNumberById.get(pick.prompt_id) ?? 0
            const existing = responseByPromptId.get(pick.prompt_id) ?? null
            const boundSave = saveResponse.bind(null, reflection.id, pick.prompt_id)
            return (
              <ResponseEditor
                key={pick.prompt_id}
                promptNumber={num}
                promptText={prompt.text}
                promptIsRetired={!prompt.is_active}
                response={existing}
                saveAction={boundSave}
                reflectionId={reflection.id}
              />
            )
          })
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line-ghost pt-6">
        <Link
          href="/reflections"
          className="border border-transparent px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
        >
          Back to Archive
        </Link>
        <div className="ml-auto">
          <TerminateReflectionButton reflectionId={reflection.id} />
        </div>
      </div>
    </main>
  )
}

function Alert({ kind, message }: { kind: "error" | "warning"; message: string }) {
  const isError = kind === "error"
  const color = isError ? "var(--red)" : "var(--amber)"
  const borderClass = isError ? "border-red/40" : "border-amber-dim"
  const bg = isError ? "var(--red-dim)" : "rgba(201,162,74,0.08)"
  const heading = isError ? "Cycle Error" : "Partial Success"
  return (
    <div
      role="alert"
      className={`relative mb-6 flex items-start gap-2 border ${borderClass} px-3 py-2`}
      style={{ background: bg }}
    >
      <CornerMarks />
      <span
        className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <div>
        <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color }}>
          {heading}
        </p>
        <p className="mt-1 text-[10.5px] leading-relaxed" style={{ color: isError ? "var(--red)" : "var(--line-mid)" }}>
          {message}
        </p>
      </div>
    </div>
  )
}
