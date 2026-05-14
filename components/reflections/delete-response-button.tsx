"use client"

import { useState } from "react"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { deleteResponse } from "@/app/(authed)/reflections/actions"

/**
 * Two-step inline confirm for deleting a single reflection response.
 * Same pattern as the journal entry terminator. Response delete is a hard delete
 * (no is_active column on reflection_responses), so the confirm matters.
 */
export function DeleteResponseButton({
  responseId,
  reflectionId,
}: {
  responseId: string
  reflectionId: string
}) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="border border-red/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-red transition-colors hover:border-red"
      >
        Delete Response
      </button>
    )
  }

  return (
    <form action={deleteResponse} className="flex items-center gap-2">
      <input type="hidden" name="response_id" value={responseId} />
      <input type="hidden" name="reflection_id" value={reflectionId} />
      <button
        type="submit"
        className="relative flex items-center gap-2 border border-red px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-line transition-colors"
        style={{
          background: "var(--red-dim)",
          boxShadow: "0 0 8px rgba(184,64,64,0.22)",
        }}
      >
        <CornerMarks />
        <StatusDot active color="var(--red)" />
        Confirm Delete
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="border border-transparent px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
      >
        Cancel
      </button>
    </form>
  )
}
