import {
  trajectoryStatusBorder,
  trajectoryStatusColor,
  type TrajectoryStatus,
} from "@/lib/trajectories/format"

/** 8px bordered status pill — same silhouette as the satellite trajectory pill. */
export function StatusPill({
  status,
  className,
}: {
  status: TrajectoryStatus
  className?: string
}) {
  return (
    <span
      className={`border px-[6px] py-[1px] text-[8px] tracking-[0.12em] ${className ?? ""}`}
      style={{
        color: trajectoryStatusColor(status),
        borderColor: trajectoryStatusBorder(status),
      }}
    >
      {status}
    </span>
  )
}
