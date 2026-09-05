"use client"

import { useState } from "react"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import {
  abandonTrajectory,
  archiveTrajectory,
} from "@/app/(authed)/trajectories/actions"

const COPY = {
  abandon: {
    idle: "Abandon Vector",
    confirm: "Confirm Abandon",
    action: abandonTrajectory,
  },
  archive: {
    idle: "Archive Trajectory",
    confirm: "Confirm Archive",
    action: archiveTrajectory,
  },
} as const

/**
 * Two-step inline confirm, matching DeleteEntryButton / TerminateReflectionButton.
 *   - abandon → sets status ABANDONED (still readable, still exportable)
 *   - archive → is_active = false (soft delete, drops off every list)
 */
export function DangerActionButton({
  trajectoryId,
  variant,
}: {
  trajectoryId: string
  variant: "abandon" | "archive"
}) {
  const [armed, setArmed] = useState(false)
  const copy = COPY[variant]

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="border border-red/40 px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-red transition-colors hover:border-red"
      >
        {copy.idle}
      </button>
    )
  }

  return (
    <form action={copy.action} className="flex items-center gap-2">
      <input type="hidden" name="trajectory_id" value={trajectoryId} />
      <button
        type="submit"
        className="relative flex items-center gap-2 border border-red px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-line transition-colors"
        style={{
          background: "var(--red-dim)",
          boxShadow: "0 0 8px rgba(184,64,64,0.25)",
        }}
      >
        <CornerMarks />
        <StatusDot active color="var(--red)" />
        {copy.confirm}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="border border-transparent px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
      >
        Cancel
      </button>
    </form>
  )
}
