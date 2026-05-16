import { CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"

type Props = {
  pendingCount: number
  completedCount: number
}

/**
 * Compact panel that POSTs (via GET, since download is read-only) to
 * /api/export/directives with the selected scope. Native checkboxes keep this
 * a server component — no client state needed for two toggles.
 */
export function ManifestExportForm({ pendingCount, completedCount }: Props) {
  return (
    <div className="relative border border-line-dim p-5">
      <CornerMarks />
      <form
        action="/api/export/directives"
        method="GET"
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <Crosshair />
          <Label>Extract Manifest // Obsidian Checklist</Label>
        </div>
        <p className="text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
          Downloads as a single <code className="text-amber">.md</code> file with the
          selected directives rendered as Obsidian-compatible checkboxes.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-[10.5px] tracking-[0.04em] text-line">
            <input
              type="checkbox"
              name="include"
              value="pending"
              defaultChecked
              className="h-[14px] w-[14px] cursor-pointer accent-phosphor"
            />
            <span>
              Active Queue{" "}
              <span className="text-amber-dim">({pendingCount})</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[10.5px] tracking-[0.04em] text-line">
            <input
              type="checkbox"
              name="include"
              value="completed"
              defaultChecked
              className="h-[14px] w-[14px] cursor-pointer accent-phosphor"
            />
            <span>
              Archive{" "}
              <span className="text-amber-dim">({completedCount})</span>
            </span>
          </label>
        </div>
        <button
          type="submit"
          className="relative flex items-center justify-between border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
        >
          <CornerMarks />
          <span>Download Manifest .md</span>
          <span className="flex items-center gap-2 text-amber-dim">
            <span>{"//"}</span>
            <StatusDot active />
          </span>
        </button>
      </form>
    </div>
  )
}
