import { CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"
import { DictationButton } from "@/components/ui/dictation-button"
import { addLogEntry } from "@/app/(authed)/trajectories/actions"

/** Append-only log input. Sits at the top of the log, above the newest entry. */
export function AddLogForm({ trajectoryId }: { trajectoryId: string }) {
  return (
    <div className="relative border border-line-dim p-5">
      <CornerMarks />
      <form action={addLogEntry} className="flex flex-col gap-4">
        <input type="hidden" name="trajectory_id" value={trajectoryId} />
        <div className="flex min-h-[24px] items-center gap-2">
          <Crosshair />
          <Label>Log Contact // Append Entry</Label>
          <div className="ml-auto">
            <DictationButton targetId="trajectory-log-body" fieldLabel="this log entry" />
          </div>
        </div>
        <textarea
          id="trajectory-log-body"
          name="body"
          rows={4}
          required
          maxLength={20000}
          autoComplete="off"
          placeholder="What moved? What did you learn? Where is this going now?"
          className="resize-y border border-line-ghost bg-transparent p-3 text-[11.5px] leading-relaxed tracking-[0.02em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-line-dim"
        />
        <button
          type="submit"
          className="relative flex items-center justify-between border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
        >
          <CornerMarks />
          <span>+ Append to Log</span>
          <span className="flex items-center gap-2 text-amber-dim">
            <span>{"//"}</span>
            <StatusDot active />
          </span>
        </button>
      </form>
    </div>
  )
}
