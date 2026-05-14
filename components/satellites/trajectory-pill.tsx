import { trajectoryColor, type TrajectoryStatus } from "@/lib/satellites/classify"

/** Status pill matching the design system — bordered, 8px, colored by trajectory tier. */
export function TrajectoryPill({ status }: { status: TrajectoryStatus }) {
  const color = trajectoryColor(status)
  const borderColor =
    status === "NEW" || status === "NOMINAL" ? "var(--amber-dim)" : "var(--line-ghost)"
  return (
    <span
      className="border px-[6px] py-[1px] text-[8px] tracking-[0.12em]"
      style={{ color, borderColor }}
    >
      {status}
    </span>
  )
}
