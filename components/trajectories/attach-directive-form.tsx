import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { attachDirective } from "@/app/(authed)/trajectories/actions"

/**
 * Quick-add: creates a task already linked to this trajectory. It shows up in
 * the main directives manifest too — attachment is a pointer, not a separate list.
 */
export function AttachDirectiveForm({ trajectoryId }: { trajectoryId: string }) {
  return (
    <form
      action={attachDirective}
      className="relative flex flex-col gap-3 border border-line-dim p-4 sm:flex-row sm:items-center"
    >
      <CornerMarks />
      <input type="hidden" name="trajectory_id" value={trajectoryId} />
      <input
        name="title"
        type="text"
        required
        maxLength={300}
        autoComplete="off"
        placeholder="Next concrete step…"
        className="min-w-0 flex-1 border-b border-line-dim bg-transparent px-0 py-2 text-[12px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
      />
      <button
        type="submit"
        className="flex shrink-0 items-center gap-2 border border-line-dim px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
      >
        + Queue Directive
        <StatusDot active />
      </button>
    </form>
  )
}
