import { CornerMarks, StatusDot } from "@/components/ui/schematic"
import { padPromptNumber } from "@/lib/prompts/format"
import { retirePrompt, reactivatePrompt } from "@/app/(authed)/prompts/actions"

export type PromptRowData = {
  id: string
  text: string
  is_active: boolean
  prompt_number: number
  weeks_used: number
}

export function PromptRow({ prompt }: { prompt: PromptRowData }) {
  const action = prompt.is_active ? retirePrompt : reactivatePrompt
  const label = prompt.is_active ? "Retire" : "Reactivate"
  const dotColor = prompt.is_active ? "var(--phosphor)" : "var(--line-dim)"
  const statusText = prompt.is_active ? "ACTIVE" : "RETIRED"
  const statusColor = prompt.is_active ? "var(--phosphor)" : "var(--line-dim)"

  return (
    <div className="relative flex flex-wrap items-center gap-3 border border-line-dim px-4 py-3 sm:flex-nowrap sm:gap-4">
      <CornerMarks />
      <div className="flex shrink-0 items-center gap-3">
        <StatusDot active={prompt.is_active} color={dotColor} />
        <span className="text-[9px] tracking-[0.12em] text-amber-dim">
          P-{padPromptNumber(prompt.prompt_number)}
        </span>
      </div>
      <p
        className={
          "min-w-0 flex-1 text-[12px] leading-relaxed tracking-[0.02em] " +
          (prompt.is_active ? "text-line" : "text-line-mid")
        }
      >
        {prompt.text}
      </p>
      {/* w-full pushes the cluster to its own row below sm, then sits inline at sm+. */}
      <div className="flex w-full shrink-0 items-center justify-end gap-3 border-t border-line-ghost pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
        <span className="text-[9px] tracking-[0.08em] text-amber-dim">
          {prompt.weeks_used}W
        </span>
        <span
          className="border border-line-ghost px-2 py-[1px] text-[8px] tracking-[0.12em]"
          style={{ color: statusColor }}
        >
          {statusText}
        </span>
        <form action={action}>
          <input type="hidden" name="prompt_id" value={prompt.id} />
          <button
            type="submit"
            className="border border-transparent px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
          >
            {label}
          </button>
        </form>
      </div>
    </div>
  )
}
