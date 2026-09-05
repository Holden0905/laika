import Link from "next/link"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { StatusPill } from "@/components/trajectories/status-pill"
import {
  formatContactAge,
  isStaleContact,
  padTrajectoryNumber,
} from "@/lib/trajectories/format"
import type { PingTrajectory } from "@/lib/trajectories/queries"

/**
 * Home-page panel: one long-horizon vector surfaced per day, deterministic by
 * local date (see rotationIndex). The point is involuntary contact — you don't
 * choose which trajectory looks back at you.
 */
export function DeepSpacePing({ trajectory }: { trajectory: PingTrajectory }) {
  const stale = isStaleContact(trajectory.status, trajectory.last_contact_at)
  const age = formatContactAge(trajectory.last_contact_at)

  return (
    <Link
      href={`/trajectories/${trajectory.id}`}
      className="relative block border border-line-dim p-5 transition-colors hover:border-line-mid"
    >
      <CornerMarks />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.12em] text-amber-dim">
            T-{padTrajectoryNumber(trajectory.trajectory_number)}
          </span>
          <StatusPill status={trajectory.status} />
        </div>
        <span
          className="flex items-center gap-2 text-[9px] tracking-[0.08em]"
          style={{ color: stale ? "var(--red)" : "var(--amber-dim)" }}
        >
          <StatusDot
            active
            color={stale ? "var(--red)" : "var(--phosphor)"}
          />
          CONTACT {age}
        </span>
      </div>
      <p className="text-[13px] font-semibold leading-snug tracking-[0.04em] text-line">
        {trajectory.title}
      </p>
      <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
        {stale
          ? "This vector has drifted out of contact. Log an entry to pull it back into range."
          : "Still in range. Append to the log if anything has moved."}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-amber-dim">
        + Log Contact →
      </span>
    </Link>
  )
}
