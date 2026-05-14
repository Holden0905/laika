"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Interactive 5-segment mood selector. Cumulative fill (click 3 → segments 1-3 light up).
 * Clicking the currently-selected level clears the value. Posts as form field `name`,
 * empty string when unset.
 */
export function MoodSelector({
  name,
  defaultValue,
  className,
}: {
  name: string
  defaultValue?: number | null
  className?: string
}) {
  const [value, setValue] = useState<number | null>(defaultValue ?? null)

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value !== null && n <= value
          return (
            <button
              key={n}
              type="button"
              onClick={() => setValue((cur) => (cur === n ? null : n))}
              aria-label={`Mood level ${n} of 5`}
              aria-pressed={value === n}
              className={cn(
                "h-[24px] w-[36px] border transition-all sm:h-[14px] sm:w-[32px]",
                filled ? "border-transparent" : "border-line-dim hover:border-line-mid"
              )}
              style={{
                background: filled ? "var(--phosphor)" : "transparent",
                opacity: filled ? 0.75 : 1,
                boxShadow: value === n ? "0 0 6px rgba(58,189,111,0.4)" : "none",
              }}
            />
          )
        })}
      </div>
      <span className="w-12 text-[10px] tracking-[0.04em] text-line-mid">
        {value !== null ? `${value} / 5` : "—"}
      </span>
    </div>
  )
}
