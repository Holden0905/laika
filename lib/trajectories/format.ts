/**
 * Trajectory formatting + status vocabulary.
 *
 * Not to be confused with lib/satellites/classify.ts, which uses "trajectory"
 * in the older sense of a prompt's momentum (ASCENDING / DECAYING / …). This
 * module is about the Trajectories module — long-horizon seeds and ambitions.
 */

export type TrajectoryStatus = "DORMANT" | "ACTIVE" | "REACHED" | "ABANDONED"

export const TRAJECTORY_STATUSES: readonly TrajectoryStatus[] = [
  "DORMANT",
  "ACTIVE",
  "REACHED",
  "ABANDONED",
] as const

/** Statuses that are still in play — everything else lives in the archive. */
export const OPEN_STATUSES: readonly TrajectoryStatus[] = ["ACTIVE", "DORMANT"] as const

export function isTrajectoryStatus(value: string): value is TrajectoryStatus {
  return (TRAJECTORY_STATUSES as readonly string[]).includes(value)
}

/** 7 → "007". Trajectories are T-### like directives are D-###. */
export function padTrajectoryNumber(n: number): string {
  return n.toString().padStart(3, "0")
}

/**
 * Status color, following the design system's usage rules:
 *   line     → ACTIVE     (primary content, in play right now)
 *   amber    → DORMANT    (metadata / resting, not a failure)
 *   phosphor → REACHED    (signal complete)
 *   line-dim → ABANDONED  (offline, same read as a decommissioned satellite)
 * Red is reserved for the stale-contact warning, not for a status.
 */
export function trajectoryStatusColor(status: TrajectoryStatus): string {
  switch (status) {
    case "ACTIVE":
      return "var(--line)"
    case "DORMANT":
      return "var(--amber)"
    case "REACHED":
      return "var(--phosphor)"
    case "ABANDONED":
      return "var(--line-dim)"
  }
}

export function trajectoryStatusBorder(status: TrajectoryStatus): string {
  switch (status) {
    case "ACTIVE":
      return "var(--line-dim)"
    case "DORMANT":
      return "var(--amber-dim)"
    case "REACHED":
      return "var(--phosphor)"
    case "ABANDONED":
      return "var(--line-ghost)"
  }
}

/** Local midnight for a timestamp — day math must not drift on UTC offsets. */
function localDayNumber(d: Date): number {
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000
  )
}

/**
 * Whole calendar days between a timestamptz and now, in local time.
 * `last_contact_at` is a timestamp (not a `date` column), so parsing it through
 * new Date() is correct here — the CLAUDE.md warning is about date strings.
 */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 0
  return Math.max(0, localDayNumber(now) - localDayNumber(then))
}

/** "TODAY" / "1D AGO" / "23D AGO" — the schematic contact-age readout. */
export function formatContactAge(iso: string, now: Date = new Date()): string {
  const days = daysSince(iso, now)
  return days === 0 ? "TODAY" : `${days}D AGO`
}

/** Past this, an in-play trajectory reads as drifting and the age goes red. */
export const STALE_CONTACT_DAYS = 30

export function isStaleContact(
  status: TrajectoryStatus,
  iso: string,
  now: Date = new Date()
): boolean {
  if (status !== "ACTIVE" && status !== "DORMANT") return false
  return daysSince(iso, now) >= STALE_CONTACT_DAYS
}

/** timestamptz → "YYYY-MM-DD" in local time. Used for log entry headings. */
export function localDateString(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** timestamptz → "05.13.2026", matching the directive/entry row readout. */
export function formatShortStamp(iso: string): string {
  const [y, m, d] = localDateString(iso).split("-")
  return `${m}.${d}.${y}`
}

/**
 * Deterministic daily rotation: same trajectory all day, a different one
 * tomorrow. Indexes by local day number so it turns over at local midnight.
 */
export function rotationIndex(length: number, now: Date = new Date()): number {
  if (length <= 0) return 0
  return localDayNumber(now) % length
}
