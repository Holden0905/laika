import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Crosshair,
  Label,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { PromptPicker, type PickablePrompt } from "@/components/reflections/prompt-picker"
import { currentIsoWeek } from "@/lib/reflections/format"
import { createReflection } from "../actions"

type SearchParams = Promise<{ error?: string }>

type PromptRow = {
  id: string
  text: string
  is_active: boolean
  created_at: string
}

export default async function NewReflectionPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data, error: queryError } = await supabase
    .from("prompts")
    .select("id, text, is_active, created_at")
    .order("created_at", { ascending: true })

  const allPrompts = (data as PromptRow[] | null) ?? []
  const numbered = allPrompts.map((p, i) => ({ ...p, prompt_number: i + 1 }))
  const active: PickablePrompt[] = numbered
    .filter((p) => p.is_active)
    .map((p) => ({ id: p.id, text: p.text, prompt_number: p.prompt_number }))

  const thisWeek = currentIsoWeek()

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader label="New Cycle — Configure" className="mb-3" />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          INITIATE REFLECTION CYCLE
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          Select the week to reflect on and pick the satellites you want to address. You can
          answer them in any order after the cycle is created.
        </p>
        <div className="mt-4">
          <Ruler count={32} />
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
          Query failed: {queryError.message}
        </div>
      ) : null}

      <form action={createReflection} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Crosshair />
            <Label>Field 01 // ISO Week</Label>
          </div>
          <input
            name="iso_week"
            type="week"
            required
            defaultValue={thisWeek.isoString}
            className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors [color-scheme:dark] focus:border-phosphor"
          />
          <p className="text-[9px] tracking-[0.14em] text-amber-dim">
            DEFAULTS TO CURRENT WEEK ({thisWeek.isoString})
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Crosshair />
            <Label>Field 02 // Active Satellites — Select for This Cycle</Label>
          </div>
          <PromptPicker prompts={active} defaultSelected={active.map((p) => p.id)} />
          {active.length === 0 ? (
            <p className="text-[10.5px] text-line-mid">
              You need at least one active prompt.{" "}
              <Link href="/prompts" className="text-amber underline">
                Visit the Prompt Library
              </Link>{" "}
              to launch one.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={active.length === 0}
            className="relative flex flex-1 items-center justify-between border border-line-dim px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CornerMarks />
            <span>Initiate Cycle</span>
            <span className="flex items-center gap-2 text-amber-dim">
              <span>{"//"}</span>
              <StatusDot active />
            </span>
          </button>
          <Link
            href="/reflections"
            className="border border-transparent px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
