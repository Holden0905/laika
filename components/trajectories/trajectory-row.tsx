import Link from "next/link"
import { CornerMarks } from "@/components/ui/schematic"
import { StatusPill } from "@/components/trajectories/status-pill"
import { VaporizeButton } from "@/components/trajectories/vaporize-button"
import {
  formatContactAge,
  isStaleContact,
  padTrajectoryNumber,
  type TrajectoryStatus,
} from "@/lib/trajectories/format"

export type TrajectoryRowData = {
  id: string
  trajectory_number: number
  title: string
  summary: string | null
  status: TrajectoryStatus
  last_contact_at: string
  log_count: number
  directive_count: number
}

export function TrajectoryRow({
  trajectory,
  vaporizable = false,
}: {
  trajectory: TrajectoryRowData
  /** Archived rows get a permanent-delete control so the archive can be cleared. */
  vaporizable?: boolean
}) {
  const stale = isStaleContact(trajectory.status, trajectory.last_contact_at)
  const age = formatContactAge(trajectory.last_contact_at)

  const content = (
    <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[9px] tracking-[0.12em] text-amber-dim">
            T-{padTrajectoryNumber(trajectory.trajectory_number)}
          </span>
          <span
            className="text-[9px] tracking-[0.08em]"
            style={{ color: stale ? "var(--red)" : "var(--amber-dim)" }}
            title={stale ? "No contact in over 30 days" : undefined}
          >
            CONTACT {age}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed tracking-[0.02em] text-line">
          {trajectory.title}
        </p>
        {trajectory.summary ? (
          <p className="mt-1 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
            {trajectory.summary}
          </p>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-3 border-t border-line-ghost pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
        <span className="text-[9px] tracking-[0.08em] text-amber-dim">
          {trajectory.log_count} LOG
        </span>
        <span className="text-[9px] tracking-[0.08em] text-amber-dim">
          {trajectory.directive_count} DIR
        </span>
        <StatusPill status={trajectory.status} />
      </div>
    </div>
  )

  if (!vaporizable) {
    return (
      <Link
        href={`/trajectories/${trajectory.id}`}
        className="relative block border border-line-dim px-4 py-3 transition-colors hover:border-line-mid"
      >
        <CornerMarks />
        {content}
      </Link>
    )
  }

  // The row can't be one big anchor here: a button nested inside an <a> is
  // invalid markup and swallows its own clicks. The Link wraps the content only.
  return (
    <div className="relative border border-line-dim px-4 py-3 transition-colors hover:border-line-mid">
      <CornerMarks />
      <Link
        href={`/trajectories/${trajectory.id}`}
        className="block transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
      <div className="mt-3 flex justify-end border-t border-line-ghost pt-3">
        <VaporizeButton
          trajectoryId={trajectory.id}
          title={trajectory.title}
          logCount={trajectory.log_count}
          directiveCount={trajectory.directive_count}
        />
      </div>
    </div>
  )
}
