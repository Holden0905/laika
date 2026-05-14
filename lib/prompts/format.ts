/** 7 → "007". The schematic mockup uses 3-digit padded prompt IDs (P-001). */
export function padPromptNumber(n: number) {
  return n.toString().padStart(3, "0")
}

export type SatelliteStatus = "NEW" | "NOMINAL" | "STABLE"

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000

/**
 * Classify a prompt's status based on age + usage:
 *   - NEW:     created in the last 4 weeks (regardless of usage).
 *   - STABLE:  8+ weeks of recorded usage.
 *   - NOMINAL: anything in between.
 *
 * Matches the mockup labels in design/reference/laika-home-v3.jsx.
 */
export function classifySatellite(opts: {
  weeksUsed: number
  createdAt: string
  now?: Date
}): SatelliteStatus {
  const now = opts.now ?? new Date()
  const created = new Date(opts.createdAt)
  if (now.getTime() - created.getTime() < FOUR_WEEKS_MS) return "NEW"
  if (opts.weeksUsed >= 8) return "STABLE"
  return "NOMINAL"
}
