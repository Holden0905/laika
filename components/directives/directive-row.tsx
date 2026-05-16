import { CheckIndicator, CornerMarks } from "@/components/ui/schematic"
import {
  completeDirective,
  reopenDirective,
  archiveDirective,
} from "@/app/(authed)/directives/actions"

export type DirectiveRowData = {
  id: string
  directive_number: number
  title: string
  description: string | null
  is_complete: boolean
  completed_at: string | null
  created_at: string
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${m}.${day}.${y}`
}

function padDirectiveNumber(n: number): string {
  return n.toString().padStart(3, "0")
}

export function DirectiveRow({ directive }: { directive: DirectiveRowData }) {
  const toggleAction = directive.is_complete ? reopenDirective : completeDirective
  const toggleLabel = directive.is_complete
    ? "Mark directive as pending"
    : "Mark directive as complete"
  const statusText = directive.is_complete ? "COMPLETE" : "ACTIVE"
  const statusColor = directive.is_complete ? "var(--phosphor)" : "var(--line)"
  const dateLabel = directive.is_complete && directive.completed_at
    ? `DONE ${formatShortDate(directive.completed_at)}`
    : `Q'D ${formatShortDate(directive.created_at)}`

  return (
    <div className="relative flex flex-wrap items-start gap-3 border border-line-dim px-4 py-3 sm:flex-nowrap sm:gap-4">
      <CornerMarks />
      {/* Toggle: real form submit, CheckIndicator is the visual. */}
      <form action={toggleAction} className="shrink-0">
        <input type="hidden" name="task_id" value={directive.id} />
        <button
          type="submit"
          aria-label={toggleLabel}
          className="group/check mt-[1px] flex items-center"
        >
          <CheckIndicator checked={directive.is_complete} />
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[9px] tracking-[0.12em] text-amber-dim">
            D-{padDirectiveNumber(directive.directive_number)}
          </span>
          <span className="text-[9px] tracking-[0.08em] text-amber-dim">
            {dateLabel}
          </span>
        </div>
        <p
          className={
            "mt-1 text-[12.5px] leading-relaxed tracking-[0.02em] " +
            (directive.is_complete
              ? "text-line-mid line-through decoration-phosphor/60 decoration-1"
              : "text-line")
          }
        >
          {directive.title}
        </p>
        {directive.description ? (
          <p
            className={
              "mt-1 text-[10.5px] leading-relaxed tracking-[0.02em] " +
              (directive.is_complete ? "text-line-dim" : "text-line-mid")
            }
          >
            {directive.description}
          </p>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-3 border-t border-line-ghost pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
        <span
          className="border border-line-ghost px-2 py-[1px] text-[8px] tracking-[0.12em]"
          style={{ color: statusColor }}
        >
          {statusText}
        </span>
        <form action={archiveDirective}>
          <input type="hidden" name="task_id" value={directive.id} />
          <button
            type="submit"
            className="border border-transparent px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
          >
            Archive
          </button>
        </form>
      </div>
    </div>
  )
}
