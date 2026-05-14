import { Fragment } from "react"
import { CornerMarks } from "@/components/ui/schematic"
import { padPromptNumber } from "@/lib/prompts/format"
import { trajectoryColor, type TrajectoryStatus } from "@/lib/satellites/classify"

export type TimelineWeek = {
  reflectionId: string
  year: number
  week_number: number
}

export type TimelineRow = {
  promptId: string
  promptNumber: number
  promptText: string
  status: TrajectoryStatus
  /** Aligned with weeks index-wise. */
  cells: Array<{ selected: boolean; answered: boolean }>
}

/**
 * Matrix of prompts × weeks. Filled phosphor dot = answered, hollow phosphor dot =
 * selected but skipped, empty = not in scope. Horizontally scrolls on narrow viewports.
 */
export function TimelineGrid({
  weeks,
  rows,
}: {
  weeks: TimelineWeek[]
  rows: TimelineRow[]
}) {
  if (weeks.length === 0) {
    return (
      <div className="relative border border-line-dim px-6 py-10 text-center">
        <CornerMarks />
        <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">
          No Reflection Cycles
        </p>
        <p className="mt-3 text-[11px] leading-relaxed tracking-[0.04em] text-line-mid">
          The timeline becomes a map of orbit patterns once weekly cycles begin transmitting.
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="relative border border-line-dim px-6 py-10 text-center">
        <CornerMarks />
        <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">No Satellites</p>
        <p className="mt-3 text-[11px] leading-relaxed tracking-[0.04em] text-line-mid">
          Launch prompts from the library to plot trajectories.
        </p>
      </div>
    )
  }

  const labelWidth = 240
  const cellWidth = 24
  const gridTemplate = `${labelWidth}px repeat(${weeks.length}, ${cellWidth}px)`

  return (
    <div className="relative border border-line-dim">
      <CornerMarks />
      <div className="overflow-x-auto">
        <div className="min-w-fit p-4">
          <div className="grid items-center" style={{ gridTemplateColumns: gridTemplate }}>
            {/* Header row */}
            <span className="pr-3 text-[8px] uppercase tracking-[0.14em] text-amber-dim">
              Satellite · Week →
            </span>
            {weeks.map((w) => (
              <span
                key={w.reflectionId}
                className="text-center text-[8px] tracking-[0.08em] text-amber-dim"
              >
                W{w.week_number}
              </span>
            ))}

            {/* Spacer row — small visual break */}
            <span className="col-span-full mt-[6px] mb-[6px] h-px bg-line-ghost" />

            {/* Body rows */}
            {rows.map((row) => (
              <Fragment key={row.promptId}>
                <div className="flex min-w-0 items-center gap-2 pr-3">
                  <span
                    className="inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{ background: trajectoryColor(row.status) }}
                    aria-hidden
                  />
                  <span className="shrink-0 text-[9px] tracking-[0.08em] text-amber-dim">
                    P-{padPromptNumber(row.promptNumber)}
                  </span>
                  <span className="truncate text-[10px] tracking-[0.04em] text-line">
                    {row.promptText}
                  </span>
                </div>
                {row.cells.map((cell, i) => (
                  <Cell key={i} selected={cell.selected} answered={cell.answered} />
                ))}
              </Fragment>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-line-ghost pt-3 text-[8px] uppercase tracking-[0.14em] text-amber-dim">
            <LegendItem variant="filled" label="Answered" />
            <LegendItem variant="hollow" label="Selected · Unanswered" />
            <LegendItem variant="empty" label="Not Selected" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Cell({ selected, answered }: { selected: boolean; answered: boolean }) {
  return (
    <div
      className="flex h-[24px] w-[24px] items-center justify-center"
      aria-label={!selected ? "Not selected" : answered ? "Answered" : "Selected, unanswered"}
    >
      {selected ? (
        answered ? (
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{
              background: "var(--phosphor)",
              boxShadow: "0 0 4px rgba(58,189,111,0.45)",
            }}
          />
        ) : (
          <span
            className="h-[7px] w-[7px] rounded-full border"
            style={{ borderColor: "var(--phosphor)" }}
          />
        )
      ) : null}
    </div>
  )
}

function LegendItem({
  variant,
  label,
}: {
  variant: "filled" | "hollow" | "empty"
  label: string
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-[14px] w-[14px] items-center justify-center">
        {variant === "filled" ? (
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{ background: "var(--phosphor)" }}
          />
        ) : variant === "hollow" ? (
          <span
            className="h-[7px] w-[7px] rounded-full border"
            style={{ borderColor: "var(--phosphor)" }}
          />
        ) : (
          <span className="h-[7px] w-[7px] border border-line-ghost" />
        )}
      </span>
      <span>{label}</span>
    </span>
  )
}
