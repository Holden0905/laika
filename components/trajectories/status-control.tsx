import { Label } from "@/components/ui/schematic"
import { setTrajectoryStatus } from "@/app/(authed)/trajectories/actions"
import {
  TRAJECTORY_STATUSES,
  trajectoryStatusBorder,
  trajectoryStatusColor,
  type TrajectoryStatus,
} from "@/lib/trajectories/format"

/**
 * Four one-click status buttons. The current status renders as a static pill;
 * the others are submits. Server component — no client state needed.
 * ABANDONED is deliberately absent here: it goes through the two-step confirm.
 */
export function StatusControl({
  trajectoryId,
  status,
}: {
  trajectoryId: string
  status: TrajectoryStatus
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label className="mr-1">Status</Label>
      {TRAJECTORY_STATUSES.filter((s) => s !== "ABANDONED" || status === "ABANDONED").map(
        (s) => {
          const current = s === status
          if (current) {
            return (
              <span
                key={s}
                aria-current="true"
                className="border px-[8px] py-[3px] text-[9px] tracking-[0.12em]"
                style={{
                  color: trajectoryStatusColor(s),
                  borderColor: trajectoryStatusBorder(s),
                  background:
                    s === "REACHED" ? "var(--phosphor-dim)" : "transparent",
                }}
              >
                {s}
              </span>
            )
          }
          return (
            <form key={s} action={setTrajectoryStatus}>
              <input type="hidden" name="trajectory_id" value={trajectoryId} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                className="border border-line-ghost px-[8px] py-[3px] text-[9px] tracking-[0.12em] text-line-mid transition-colors hover:border-line-dim hover:text-line"
              >
                {s}
              </button>
            </form>
          )
        }
      )}
    </div>
  )
}
