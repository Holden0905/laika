import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  JournalEntryForExport,
  ReflectionResponseForExport,
} from "./markdown"

type EntryRow = {
  id: string
  entry_number: number
  title: string | null
  body: string
  entry_date: string
  mood: number | null
  entry_tags: Array<{ tags: { name: string } | null }> | null
}

type ResponseRow = {
  id: string
  body: string
  mood: number | null
  prompt_id: string
  reflection_id: string
  prompts: { text: string } | null
  response_tags: Array<{ tags: { name: string } | null }> | null
}

type ReflectionMeta = {
  id: string
  year: number
  week_number: number
  week_start: string
}

function flattenTags(rows: Array<{ tags: { name: string } | null }> | null): string[] {
  if (!rows) return []
  return rows
    .map((r) => r.tags?.name)
    .filter((n): n is string => Boolean(n))
    .sort()
}

export async function fetchJournalEntriesForExport(
  supabase: SupabaseClient
): Promise<JournalEntryForExport[]> {
  const { data, error } = await supabase
    .from("entries_with_number")
    .select(
      `
      id,
      entry_number,
      title,
      body,
      entry_date,
      mood,
      entry_tags ( tags ( name ) )
      `
    )
    .eq("is_active", true)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Entry query failed: ${error.message}`)

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const rows = (data as unknown as EntryRow[] | null) ?? []
  return rows.map((row) => ({
    id: row.id,
    entry_number: row.entry_number,
    title: row.title,
    body: row.body,
    entry_date: row.entry_date,
    mood: row.mood,
    tags: flattenTags(row.entry_tags),
  }))
}

/**
 * Returns the set of artifact IDs (entries + responses) that this user has
 * previously exported, plus the most recent export timestamp per artifact.
 * Failure is non-fatal — if the table is missing or unreadable we return
 * empty sets so the picker still renders. Means everything looks "new" until
 * the migration is applied.
 */
export async function fetchExportedArtifacts(supabase: SupabaseClient): Promise<{
  entries: Map<string, string>
  responses: Map<string, string>
  trajectories: Map<string, string>
}> {
  const result = {
    entries: new Map<string, string>(),
    responses: new Map<string, string>(),
    trajectories: new Map<string, string>(),
  }

  const { data, error } = await supabase
    .from("exports_log")
    .select("artifact_type, artifact_id, exported_at")
    .order("exported_at", { ascending: false })

  if (error || !data) return result

  type Row = {
    artifact_type: "entry" | "response" | "trajectory"
    artifact_id: string
    exported_at: string
  }
  for (const row of data as Row[]) {
    const target =
      row.artifact_type === "entry"
        ? result.entries
        : row.artifact_type === "response"
          ? result.responses
          : result.trajectories
    // First write wins because we ordered DESC — that's the most recent timestamp.
    if (!target.has(row.artifact_id)) target.set(row.artifact_id, row.exported_at)
  }
  return result
}

export async function fetchReflectionResponsesForExport(
  supabase: SupabaseClient
): Promise<ReflectionResponseForExport[]> {
  // 1. Active reflections — gives us week metadata + the set of reflection_ids to include.
  const { data: reflectionsData, error: reflectionsErr } = await supabase
    .from("weekly_reflections")
    .select("id, year, week_number, week_start")
    .eq("is_active", true)

  if (reflectionsErr) throw new Error(`Reflection query failed: ${reflectionsErr.message}`)
  const reflections = (reflectionsData as ReflectionMeta[] | null) ?? []
  if (reflections.length === 0) return []

  const reflectionMetaById = new Map(reflections.map((r) => [r.id, r]))
  const reflectionIds = reflections.map((r) => r.id)

  // 2. Prompt numbering — stable across active + retired, ordered by created_at.
  const { data: promptsData, error: promptsErr } = await supabase
    .from("prompts")
    .select("id, created_at")
    .order("created_at", { ascending: true })

  if (promptsErr) throw new Error(`Prompt query failed: ${promptsErr.message}`)
  const promptNumberById = new Map(
    ((promptsData as Array<{ id: string }> | null) ?? []).map((p, i) => [p.id, i + 1])
  )

  // 3. Responses for those reflections.
  const { data: responsesData, error: responsesErr } = await supabase
    .from("reflection_responses")
    .select(
      `
      id,
      body,
      mood,
      prompt_id,
      reflection_id,
      prompts ( text ),
      response_tags ( tags ( name ) )
      `
    )
    .in("reflection_id", reflectionIds)
    .order("created_at", { ascending: true })

  if (responsesErr) throw new Error(`Response query failed: ${responsesErr.message}`)

  // Supabase TS inference treats single FK relations as arrays; runtime returns objects (CLAUDE.md).
  const responses = (responsesData as unknown as ResponseRow[] | null) ?? []

  const out: ReflectionResponseForExport[] = []
  for (const r of responses) {
    const meta = reflectionMetaById.get(r.reflection_id)
    if (!meta) continue
    if (!r.prompts) continue
    out.push({
      response_id: r.id,
      body: r.body,
      mood: r.mood,
      prompt_text: r.prompts.text,
      prompt_number: promptNumberById.get(r.prompt_id) ?? 0,
      reflection_year: meta.year,
      reflection_week_number: meta.week_number,
      reflection_week_start: meta.week_start,
      tags: flattenTags(r.response_tags),
    })
  }
  return out
}
