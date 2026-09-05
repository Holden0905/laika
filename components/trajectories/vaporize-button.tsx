"use client"

import { useId, useState } from "react"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { vaporizeTrajectory } from "@/app/(authed)/trajectories/actions"

/**
 * Hard delete, two-step and then some: arming reveals a field where the exact
 * title has to be typed before the confirm button unlocks.
 *
 * Archive is the reversible option and stays one click away; this one destroys
 * the log with the vector, so the friction is deliberate. The typed title is
 * re-checked server-side — this component is a speed bump, not the guard.
 */
export function VaporizeButton({
  trajectoryId,
  title,
  logCount,
  directiveCount,
}: {
  trajectoryId: string
  title: string
  logCount: number
  directiveCount: number
}) {
  const [armed, setArmed] = useState(false)
  const [typed, setTyped] = useState("")
  const inputId = `vaporize-confirm-${useId()}`

  const matches = typed.trim() === title.trim()

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="border border-red/40 px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-red transition-colors hover:border-red"
      >
        Vaporize
      </button>
    )
  }

  return (
    <form
      action={vaporizeTrajectory}
      className="relative flex w-full flex-col gap-3 border border-red/60 p-4"
      style={{ background: "var(--red-dim)" }}
    >
      <CornerMarks />
      <input type="hidden" name="trajectory_id" value={trajectoryId} />

      <div className="flex items-center gap-2">
        <StatusDot active color="var(--red)" />
        <span className="text-[9px] uppercase tracking-[0.14em] text-red">
          Irreversible — Permanent Deletion
        </span>
      </div>

      <p className="text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
        This erases the trajectory and{" "}
        <span className="text-red">
          {logCount} log {logCount === 1 ? "entry" : "entries"}
        </span>{" "}
        from the database. It cannot be undone — archive instead if you might want it
        back.{" "}
        {directiveCount > 0
          ? `${directiveCount} attached ${directiveCount === 1 ? "directive stays" : "directives stay"} in the manifest, detached.`
          : "No directives are attached."}{" "}
        Remaining trajectories renumber, so T-IDs shift.
      </p>

      <label htmlFor={inputId} className="flex flex-col gap-2">
        <span className="text-[9px] uppercase tracking-[0.14em] text-amber-dim">
          Type the title to confirm — {title}
        </span>
        <input
          id={inputId}
          name="confirm_title"
          type="text"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={title}
          className="border-b border-red/50 bg-transparent px-0 py-2 text-[12px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-red"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!matches}
          className="relative flex items-center gap-2 border px-3 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed"
          style={
            matches
              ? {
                  borderColor: "var(--red)",
                  color: "var(--line)",
                  background: "var(--red-dim)",
                  boxShadow: "0 0 8px rgba(184,64,64,0.25)",
                }
              : {
                  borderColor: "var(--line-ghost)",
                  color: "var(--line-dim)",
                  background: "transparent",
                }
          }
        >
          <CornerMarks />
          <StatusDot active={matches} color="var(--red)" />
          Confirm Vaporize
        </button>
        <button
          type="button"
          onClick={() => {
            setArmed(false)
            setTyped("")
          }}
          className="border border-transparent px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
