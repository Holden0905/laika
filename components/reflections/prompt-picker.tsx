"use client"

import { useState } from "react"
import { CheckIndicator, StatusDot } from "@/components/ui/schematic"
import { padPromptNumber } from "@/lib/prompts/format"

export type PickablePrompt = {
  id: string
  text: string
  prompt_number: number
}

/**
 * Multi-select prompt picker. Each row is a button that toggles inclusion.
 * Selected IDs are posted as repeated `prompt_ids` form fields via hidden inputs.
 */
export function PromptPicker({
  prompts,
  defaultSelected = [],
  name = "prompt_ids",
  emptyMessage = "No active satellites in orbit. Visit the prompt library to launch one.",
}: {
  prompts: PickablePrompt[]
  defaultSelected?: string[]
  name?: string
  emptyMessage?: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (prompts.length === 0) {
    return (
      <p className="border border-line-dim px-4 py-6 text-center text-[11px] tracking-[0.04em] text-line-mid">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.14em] text-amber-dim">
          {selected.size} of {prompts.length} selected
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelected(new Set(prompts.map((p) => p.id)))}
            className="text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber"
          >
            Select All
          </button>
          <span className="text-amber-dim/50">·</span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {prompts.map((p) => {
          const checked = selected.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="group flex w-full items-start gap-3 border border-line-dim px-4 py-3 text-left transition-colors hover:border-line-mid"
            >
              <CheckIndicator checked={checked} className="mt-[2px]" />
              <div className="flex min-w-0 flex-1 items-baseline gap-3">
                <span className="text-[9px] tracking-[0.12em] text-amber-dim">
                  P-{padPromptNumber(p.prompt_number)}
                </span>
                <span
                  className={`text-[12px] leading-relaxed tracking-[0.02em] ${
                    checked ? "text-line" : "text-line-mid"
                  }`}
                >
                  {p.text}
                </span>
              </div>
              <StatusDot active={checked} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
