import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Ruler,
  SectionHeader,
} from "@/components/ui/schematic"
import { AddPromptForm } from "@/components/prompts/add-prompt-form"
import { PromptRow, type PromptRowData } from "@/components/prompts/prompt-row"

type SearchParams = Promise<{ error?: string }>

type PromptRecord = {
  id: string
  text: string
  is_active: boolean
  created_at: string
  reflection_prompts: Array<{ reflection_id: string }> | null
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data, error: queryError } = await supabase
    .from("prompts")
    .select(
      `
      id,
      text,
      is_active,
      created_at,
      reflection_prompts ( reflection_id )
      `
    )
    .order("created_at", { ascending: true })

  const rows: PromptRowData[] =
    (data as PromptRecord[] | null)?.map((p, i) => ({
      id: p.id,
      text: p.text,
      is_active: p.is_active,
      prompt_number: i + 1,
      weeks_used: p.reflection_prompts?.length ?? 0,
    })) ?? []

  const active = rows.filter((r) => r.is_active)
  const retired = rows.filter((r) => !r.is_active)

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader label="Prompt Library — Satellite Array" className="mb-3" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
              PROMPT LIBRARY
            </h1>
            <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
              {active.length} active satellite{active.length === 1 ? "" : "s"} in orbit
              {retired.length > 0 ? `, ${retired.length} decommissioned` : ""}. Active prompts
              appear in the weekly reflection picker. Retired prompts stay on file so historical
              reflections still reference them.
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

      {/* Add new */}
      <div className="mb-10">
        <AddPromptForm />
      </div>

      {/* Active */}
      <div className="mb-10">
        <SectionHeader label="Active Satellites — In Orbit" className="mb-4" />
        {active.length === 0 ? (
          <EmptyState message="No active satellites. Launch one above to begin." />
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((p) => (
              <PromptRow key={p.id} prompt={p} />
            ))}
          </div>
        )}
      </div>

      {/* Retired */}
      {retired.length > 0 ? (
        <div className="mb-10">
          <SectionHeader label="Decommissioned — Preserved On File" className="mb-4" />
          <div className="flex flex-col gap-2 opacity-80">
            {retired.map((p) => (
              <PromptRow key={p.id} prompt={p} />
            ))}
          </div>
        </div>
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
