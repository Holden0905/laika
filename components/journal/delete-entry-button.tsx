"use client"

import { useState } from "react"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { deleteEntry } from "@/app/(authed)/journal/actions"

/**
 * Two-step inline confirm:
 *   - Idle: red-outlined "Terminate Entry" button.
 *   - Armed: switches to a red-filled "Confirm Termination" submit + a Cancel that disarms.
 * Soft-deletes via server action — preserves the row, just flips is_active to false.
 */
export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="border border-red/40 px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-red transition-colors hover:border-red"
      >
        Terminate Entry
      </button>
    )
  }

  return (
    <form action={deleteEntry} className="flex items-center gap-2">
      <input type="hidden" name="entry_id" value={entryId} />
      <button
        type="submit"
        className="relative flex items-center gap-2 border border-red px-3 py-3 text-[9px] uppercase tracking-[0.14em] text-line transition-colors hover:bg-red/30"
        style={{
          background: "var(--red-dim)",
          boxShadow: "0 0 8px rgba(184,64,64,0.25)",
        }}
      >
        <CornerMarks />
        <StatusDot active color="var(--red)" />
        Confirm Termination
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
