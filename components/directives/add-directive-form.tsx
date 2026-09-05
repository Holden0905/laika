import { CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"
import { DictationButton } from "@/components/ui/dictation-button"
import { createDirective } from "@/app/(authed)/directives/actions"

export function AddDirectiveForm() {
  return (
    <div className="relative border border-line-dim p-5">
      <CornerMarks />
      <form action={createDirective} className="flex flex-col gap-4">
        <div className="flex min-h-[24px] items-center gap-2">
          <Crosshair />
          <Label>New Directive // Queue Task</Label>
          <div className="ml-auto">
            <DictationButton targetId="directive-title" fieldLabel="the directive title" />
          </div>
        </div>
        <input
          id="directive-title"
          name="title"
          type="text"
          required
          maxLength={300}
          autoComplete="off"
          placeholder="What needs doing?"
          className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
        />
        <div className="flex justify-end">
          <DictationButton
            targetId="directive-description"
            fieldLabel="the directive description"
          />
        </div>
        <textarea
          id="directive-description"
          name="description"
          rows={2}
          maxLength={2000}
          autoComplete="off"
          placeholder="Optional context, payload notes, dependencies…"
          className="resize-none border border-line-ghost bg-transparent p-2 text-[11px] leading-relaxed tracking-[0.02em] text-line-mid outline-none transition-colors placeholder:text-line-dim focus:border-line-dim"
        />
        <button
          type="submit"
          className="relative flex items-center justify-between border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
        >
          <CornerMarks />
          <span>+ Queue Directive</span>
          <span className="flex items-center gap-2 text-amber-dim">
            <span>{"//"}</span>
            <StatusDot active />
          </span>
        </button>
      </form>
    </div>
  )
}
