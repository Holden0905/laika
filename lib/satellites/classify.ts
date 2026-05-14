/**
 * Trajectory classification for the satellites mission-control page.
 *
 * The richer counterpart to classifySatellite in lib/prompts/format.ts:
 * compares the prompt's selection volume in the last 4 weeks vs the prior
 * 4 weeks to produce an ASCENDING / DECAYING / STABLE reading on top of
 * the NEW + DECOMMISSIONED gates.
 */

export type TrajectoryStatus =
  | "DECOMMISSIONED"
  | "NEW"
  | "ASCENDING"
  | "STABLE"
  | "DECAYING"
  | "NOMINAL"

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000

/** Parse YYYY-MM-DD as a LOCAL date — never round-trip through new Date(string) UTC. */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function classifyTrajectory(opts: {
  isActive: boolean
  createdAt: string
  /** Week-start dates (YYYY-MM-DD) of every reflection this prompt was selected for. */
  selectionWeekStarts: string[]
  now?: Date
}): TrajectoryStatus {
  if (!opts.isActive) return "DECOMMISSIONED"

  const now = opts.now ?? new Date()
  const created = new Date(opts.createdAt)
  if (now.getTime() - created.getTime() < FOUR_WEEKS_MS) return "NEW"

  let last4 = 0
  let prior4 = 0
  for (const ws of opts.selectionWeekStarts) {
    const age = now.getTime() - parseLocalDate(ws).getTime()
    if (age < FOUR_WEEKS_MS) last4++
    else if (age < 2 * FOUR_WEEKS_MS) prior4++
  }

  if (last4 === 0 && prior4 === 0) return "NOMINAL"
  if (last4 > prior4) return "ASCENDING"
  if (last4 < prior4) return "DECAYING"
  return "STABLE"
}

/**
 * Color tier for a trajectory status. Used by both the pill and the row's status dot.
 *   phosphor → ASCENDING / STABLE (healthy)
 *   amber    → NEW / NOMINAL       (neutral)
 *   red      → DECAYING            (warning)
 *   line-dim → DECOMMISSIONED      (offline)
 */
export function trajectoryColor(status: TrajectoryStatus): string {
  switch (status) {
    case "ASCENDING":
    case "STABLE":
      return "var(--phosphor)"
    case "NEW":
    case "NOMINAL":
      return "var(--amber)"
    case "DECAYING":
      return "var(--red)"
    case "DECOMMISSIONED":
      return "var(--line-dim)"
  }
}
