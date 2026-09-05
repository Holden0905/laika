import type { SupabaseClient } from "@supabase/supabase-js"
import type { TrajectoryForExport } from "@/lib/export/markdown"
import { rotationIndex, type TrajectoryStatus } from "@/lib/trajectories/format"

export type TrajectoryRecord = {
  id: string
  title: string
  summary: string | null
  status: TrajectoryStatus
  last_contact_at: string
  is_active: boolean
  created_at: string
  tags: string[]
}

export type TrajectoryLogRecord = {
  id: string
  trajectory_id: string
  body: string
  created_at: string
}

export type AttachedDirective = {
  id: string
  trajectory_id: string
  directive_number: number
  title: string
  is_complete: boolean
  completed_at: string | null
}

export type TrajectoryBundle = {
  /** Active trajectories, creation order. */
  trajectories: TrajectoryRecord[]
  /** T-### by id. Numbered across ALL trajectories including archived ones, so
   *  archiving never renumbers its neighbours (the number ends up in export
   *  filenames, which must stay stable). */
  numberById: Map<string, number>
  /** Log entries for active trajectories, oldest first. */
  logByTrajectory: Map<string, TrajectoryLogRecord[]>
  /** Attached directives (active tasks only), creation order. */
  directivesByTrajectory: Map<string, AttachedDirective[]>
}

type TrajectoryRow = {
  id: string
  title: string
  summary: string | null
  status: TrajectoryStatus
  last_contact_at: string
  is_active: boolean
  created_at: string
  trajectory_tags: Array<{ tags: { name: string } | null }> | null
}

type TaskRow = {
  id: string
  title: string
  is_complete: boolean
  completed_at: string | null
  is_active: boolean
  trajectory_id: string | null
  created_at: string
}

function flattenTags(rows: TrajectoryRow["trajectory_tags"]): string[] {
  if (!rows) return []
  return rows
    .map((r) => r.tags?.name)
    .filter((n): n is string => Boolean(n))
    .sort()
}

/**
 * One round-trip set for everything the module needs: trajectories with tags,
 * their log entries, and the directives attached to them. Counts are computed
 * in JS rather than via PostgREST aggregates — the volume is tiny and the
 * directive count has to respect `is_active`, which embedded counts can't.
 */
export async function fetchTrajectoryBundle(
  supabase: SupabaseClient
): Promise<TrajectoryBundle> {
  const [trajectoriesRes, logRes, tasksRes] = await Promise.all([
    supabase
      .from("trajectories")
      .select(
        `
        id,
        title,
        summary,
        status,
        last_contact_at,
        is_active,
        created_at,
        trajectory_tags ( tags ( name ) )
        `
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("trajectory_log")
      .select("id, trajectory_id, body, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, is_complete, completed_at, is_active, trajectory_id, created_at")
      .order("created_at", { ascending: true }),
  ])

  if (trajectoriesRes.error) {
    throw new Error(`Trajectory query failed: ${trajectoriesRes.error.message}`)
  }

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const allRows = (trajectoriesRes.data as unknown as TrajectoryRow[] | null) ?? []

  const numberById = new Map<string, number>()
  allRows.forEach((row, i) => numberById.set(row.id, i + 1))

  const trajectories: TrajectoryRecord[] = allRows
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      status: row.status,
      last_contact_at: row.last_contact_at,
      is_active: row.is_active,
      created_at: row.created_at,
      tags: flattenTags(row.trajectory_tags),
    }))

  const logByTrajectory = new Map<string, TrajectoryLogRecord[]>()
  for (const row of (logRes.data as TrajectoryLogRecord[] | null) ?? []) {
    const bucket = logByTrajectory.get(row.trajectory_id) ?? []
    bucket.push(row)
    logByTrajectory.set(row.trajectory_id, bucket)
  }

  // D-### mirrors the directives manifest: active tasks, creation order.
  const tasks = (tasksRes.data as TaskRow[] | null) ?? []
  const activeTasks = tasks.filter((t) => t.is_active)
  const directiveNumberById = new Map<string, number>()
  activeTasks.forEach((t, i) => directiveNumberById.set(t.id, i + 1))

  const directivesByTrajectory = new Map<string, AttachedDirective[]>()
  for (const t of activeTasks) {
    if (!t.trajectory_id) continue
    const bucket = directivesByTrajectory.get(t.trajectory_id) ?? []
    bucket.push({
      id: t.id,
      trajectory_id: t.trajectory_id,
      directive_number: directiveNumberById.get(t.id) ?? 0,
      title: t.title,
      is_complete: t.is_complete,
      completed_at: t.completed_at,
    })
    directivesByTrajectory.set(t.trajectory_id, bucket)
  }

  return { trajectories, numberById, logByTrajectory, directivesByTrajectory }
}

/** Shape one bundled trajectory for the markdown builder / clipboard. */
export function toExportShape(
  bundle: TrajectoryBundle,
  trajectory: TrajectoryRecord
): TrajectoryForExport {
  const log = bundle.logByTrajectory.get(trajectory.id) ?? []
  return {
    id: trajectory.id,
    trajectory_number: bundle.numberById.get(trajectory.id) ?? 0,
    title: trajectory.title,
    summary: trajectory.summary,
    status: trajectory.status,
    created_at: trajectory.created_at,
    last_contact_at: trajectory.last_contact_at,
    tags: trajectory.tags,
    // Newest first, matching the detail page.
    log: [...log].reverse(),
    directives: (bundle.directivesByTrajectory.get(trajectory.id) ?? []).map((d) => ({
      directive_number: d.directive_number,
      title: d.title,
      is_complete: d.is_complete,
    })),
  }
}

/** Every active trajectory, shaped for export. */
export async function fetchTrajectoriesForExport(
  supabase: SupabaseClient
): Promise<TrajectoryForExport[]> {
  const bundle = await fetchTrajectoryBundle(supabase)
  return bundle.trajectories.map((t) => toExportShape(bundle, t))
}

export type PingTrajectory = {
  id: string
  trajectory_number: number
  title: string
  status: TrajectoryStatus
  last_contact_at: string
}

type PingRow = {
  id: string
  title: string
  status: TrajectoryStatus
  is_active: boolean
  last_contact_at: string
  created_at: string
}

/**
 * One trajectory for the home page's Deep Space Ping, chosen deterministically
 * by local day so it holds steady until midnight. Single query — the home page
 * doesn't need the full bundle. Returns null when there is nothing in play.
 */
export async function fetchTrajectoryPing(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<PingTrajectory | null> {
  const { data, error } = await supabase
    .from("trajectories")
    .select("id, title, status, is_active, last_contact_at, created_at")
    .order("created_at", { ascending: true })

  if (error) return null

  const rows = (data as PingRow[] | null) ?? []
  // T-### is creation order across every trajectory, archived included.
  const numberById = new Map(rows.map((r, i) => [r.id, i + 1]))

  const candidates = rows.filter(
    (r) => r.is_active && (r.status === "ACTIVE" || r.status === "DORMANT")
  )
  if (candidates.length === 0) return null

  const pick = candidates[rotationIndex(candidates.length, now)]
  return {
    id: pick.id,
    trajectory_number: numberById.get(pick.id) ?? 0,
    title: pick.title,
    status: pick.status,
    last_contact_at: pick.last_contact_at,
  }
}
