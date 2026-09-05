import { CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"
import { DictationButton } from "@/components/ui/dictation-button"
import { createTrajectory } from "@/app/(authed)/trajectories/actions"

/** Inline add form — same pattern as AddDirectiveForm, title + optional summary. */
export function AddTrajectoryForm() {
  return (
    <div className="relative border border-line-dim p-5">
      <CornerMarks />
      <form action={createTrajectory} className="flex flex-col gap-4">
        <div className="flex min-h-[24px] items-center gap-2">
          <Crosshair />
          <Label>New Trajectory // Seed Long-Horizon Vector</Label>
          <div className="ml-auto">
            <DictationButton
              targetId="new-trajectory-summary"
              fieldLabel="the trajectory summary"
            />
          </div>
        </div>
        <input
          name="title"
          type="text"
          required
          maxLength={300}
          autoComplete="off"
          placeholder="What are you moving toward?"
          className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
        />
        <textarea
          id="new-trajectory-summary"
          name="summary"
          rows={2}
          maxLength={500}
          autoComplete="off"
          placeholder="Optional — the shape of it in a sentence or two…"
          className="resize-none border border-line-ghost bg-transparent p-2 text-[11px] leading-relaxed tracking-[0.02em] text-line-mid outline-none transition-colors placeholder:text-line-dim focus:border-line-dim"
        />
        <button
          type="submit"
          className="relative flex items-center justify-between border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
        >
          <CornerMarks />
          <span>+ Seed Trajectory</span>
          <span className="flex items-center gap-2 text-amber-dim">
            <span>{"//"}</span>
            <StatusDot active />
          </span>
        </button>
      </form>
    </div>
  )
}
