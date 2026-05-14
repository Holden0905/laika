import { CheckIndicator, CornerMarks, StatusDot } from "@/components/ui/schematic"
import { padPromptNumber } from "@/lib/prompts/format"
import { trajectoryColor, type TrajectoryStatus } from "@/lib/satellites/classify"
import { formatWeekRange } from "@/lib/reflections/format"
import { TrajectoryPill } from "./trajectory-pill"

export type OrbitEvent = {
  reflectionId: string
  year: number
  week_number: number
  week_start: string
  answered: boolean
}

export type SatelliteRowData = {
  id: string
  number: number
  text: string
  isActive: boolean
  status: TrajectoryStatus
  weeksUsed: number
  timesAnswered: number
  /** Sorted newest-first by caller. */
  selections: OrbitEvent[]
}

/**
 * Expandable row. Summary shows core metadata; expanding reveals the full
 * orbit history for this satellite. Uses native <details> so no client JS.
 */
export function SatelliteRow({ sat }: { sat: SatelliteRowData }) {
  const responseRate = sat.weeksUsed > 0 ? sat.timesAnswered / sat.weeksUsed : null
  const dotColor = trajectoryColor(sat.status)

  return (
    <details className="group relative border border-line-dim">
      <CornerMarks />
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-line-ghost/30">
        <StatusDot active color={dotColor} />
        <span className="shrink-0 text-[9px] tracking-[0.12em] text-amber-dim">
          P-{padPromptNumber(sat.number)}
        </span>
        <p
          className={`min-w-0 flex-1 truncate text-[12px] leading-snug tracking-[0.02em] ${
            sat.isActive ? "text-line" : "text-line-mid"
          }`}
        >
          {sat.text}
        </p>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <Stat label="Orbit" value={`${sat.weeksUsed}W`} />
          <Stat
            label="Response"
            value={responseRate === null ? "—" : `${Math.round(responseRate * 100)}%`}
          />
        </div>
        <TrajectoryPill status={sat.status} />
        <Chevron />
      </summary>

      <div className="border-t border-line-ghost bg-line-ghost/10 px-4 py-3">
        {/* Mobile-only stat strip */}
        <div className="mb-3 flex items-center gap-4 border-b border-line-ghost pb-2 sm:hidden">
          <Stat label="Orbit" value={`${sat.weeksUsed}W`} />
          <Stat
            label="Response"
            value={responseRate === null ? "—" : `${Math.round(responseRate * 100)}%`}
          />
          <Stat label="Answered" value={`${sat.timesAnswered}`} />
        </div>

        <p className="mb-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim">
          Orbit History
        </p>
        {sat.selections.length === 0 ? (
          <p className="py-2 text-[10.5px] tracking-[0.04em] text-line-mid">
            {sat.isActive
              ? "Never selected. Add to a reflection cycle to begin charting orbit."
              : "Decommissioned without ever being placed in orbit."}
          </p>
        ) : (
          <div className="flex flex-col">
            {sat.selections.map((sel) => (
              <div
                key={sel.reflectionId}
                className="flex items-center gap-3 border-b border-line-ghost py-2 last:border-b-0"
              >
                <CheckIndicator checked={sel.answered} />
                <span className="shrink-0 text-[9px] tracking-[0.12em] text-amber-dim">
                  W{String(sel.week_number).padStart(2, "0")}-{sel.year}
                </span>
                <span className="flex-1 text-[10.5px] tracking-[0.04em] text-line-mid">
                  {formatWeekRange(sel.week_start)}
                </span>
                <span
                  className="shrink-0 text-[9px] uppercase tracking-[0.14em]"
                  style={{ color: sel.answered ? "var(--phosphor)" : "var(--amber-dim)" }}
                >
                  {sel.answered ? "Answered" : "Skipped"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-[8px] uppercase tracking-[0.14em] text-amber-dim">{label}</span>
      <span className="text-[10px] tracking-[0.04em] text-line">{value}</span>
    </span>
  )
}

function Chevron() {
  return (
    <span
      className="shrink-0 text-[10px] text-amber-dim transition-transform group-open:rotate-45"
      aria-hidden
    >
      +
    </span>
  )
}
