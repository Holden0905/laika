import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Insert any missing tag rows, then return (id, name) for the given names.
 * Two-step (upsert ignore + select) avoids needlessly updating existing rows.
 * Mirrors the helper in app/(authed)/journal/actions.ts — kept here so the
 * trajectory junction can share it without reaching into a route's actions.
 */
export async function ensureTags(
  supabase: SupabaseClient,
  userId: string,
  names: string[]
): Promise<{ id: string; name: string }[]> {
  if (names.length === 0) return []
  const { error: upsertErr } = await supabase
    .from("tags")
    .upsert(
      names.map((name) => ({ user_id: userId, name })),
      { onConflict: "user_id,name", ignoreDuplicates: true }
    )
  if (upsertErr) throw new Error(`Tag upsert failed: ${upsertErr.message}`)

  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", userId)
    .in("name", names)
  if (error) throw new Error(`Tag select failed: ${error.message}`)
  return data ?? []
}

/** Replace strategy: clear existing junctions for the trajectory, insert fresh. */
export async function syncTrajectoryTags(
  supabase: SupabaseClient,
  userId: string,
  trajectoryId: string,
  names: string[]
) {
  const { error: delErr } = await supabase
    .from("trajectory_tags")
    .delete()
    .eq("trajectory_id", trajectoryId)
  if (delErr) throw new Error(`Junction clear failed: ${delErr.message}`)

  const tagRows = await ensureTags(supabase, userId, names)
  if (tagRows.length === 0) return
  const { error: insErr } = await supabase.from("trajectory_tags").insert(
    tagRows.map((t) => ({
      trajectory_id: trajectoryId,
      tag_id: t.id,
      user_id: userId,
    }))
  )
  if (insErr) throw new Error(`Junction insert failed: ${insErr.message}`)
}
