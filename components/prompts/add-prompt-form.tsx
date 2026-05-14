import { CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"
import { createPrompt } from "@/app/(authed)/prompts/actions"

export function AddPromptForm() {
  return (
    <div className="relative border border-line-dim p-5">
      <CornerMarks />
      <form action={createPrompt} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Crosshair />
          <Label>New Satellite // Prompt Text</Label>
        </div>
        <input
          name="text"
          type="text"
          required
          maxLength={300}
          autoComplete="off"
          placeholder="What question do you want to keep in orbit?"
          className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
        />
        <button
          type="submit"
          className="relative flex items-center justify-between border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
        >
          <CornerMarks />
          <span>+ Launch Satellite</span>
          <span className="flex items-center gap-2 text-amber-dim">
            <span>{"//"}</span>
            <StatusDot active />
          </span>
        </button>
      </form>
    </div>
  )
}
