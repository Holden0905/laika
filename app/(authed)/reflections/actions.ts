"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { parseTags } from "@/lib/journal/format"
import { parseIsoWeek, isoWeekToMonday } from "@/lib/reflections/format"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, userId: user.id }
}

/** Insert any missing tag rows, return all (id, name) for the names provided. */
async function ensureTags(
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

async function syncResponseTags(
  supabase: SupabaseClient,
  userId: string,
  responseId: string,
  names: string[]
) {
  const { error: delErr } = await supabase
    .from("response_tags")
    .delete()
    .eq("response_id", responseId)
  if (delErr) throw new Error(`Tag clear failed: ${delErr.message}`)

  const tagRows = await ensureTags(supabase, userId, names)
  if (tagRows.length === 0) return
  const { error: insErr } = await supabase
    .from("response_tags")
    .insert(
      tagRows.map((t) => ({ response_id: responseId, tag_id: t.id, user_id: userId }))
    )
  if (insErr) throw new Error(`Tag link failed: ${insErr.message}`)
}

// ─── createReflection ──────────────────────────────────────────────────────────

export async function createReflection(formData: FormData) {
  const { supabase, userId } = await requireUser()

  const isoWeek = String(formData.get("iso_week") ?? "").trim()
  const promptIds = formData
    .getAll("prompt_ids")
    .map((v) => String(v).trim())
    .filter(Boolean)

  const parsed = parseIsoWeek(isoWeek)
  if (!parsed) {
    redirect(
      `/reflections/new?error=${encodeURIComponent("Pick a valid ISO week (YYYY-Www).")}`
    )
  }
  if (promptIds.length === 0) {
    redirect(
      `/reflections/new?error=${encodeURIComponent("Pick at least one prompt for this reflection.")}`
    )
  }

  const monday = isoWeekToMonday(parsed.year, parsed.week)

  // Check for existing reflection on this (user, year, week).
  const { data: existing } = await supabase
    .from("weekly_reflections")
    .select("id, is_active")
    .eq("year", parsed.year)
    .eq("week_number", parsed.week)
    .maybeSingle()

  if (existing && existing.is_active) {
    redirect(`/reflections/${existing.id}`)
  }

  let reflectionId: string
  if (existing && !existing.is_active) {
    // Reactivate a previously-terminated reflection for this week rather than blocking on UNIQUE.
    const { error: reActErr } = await supabase
      .from("weekly_reflections")
      .update({ is_active: true, week_start: monday })
      .eq("id", existing.id)
    if (reActErr) {
      redirect(`/reflections/new?error=${encodeURIComponent(reActErr.message)}`)
    }
    reflectionId = existing.id
    // Clear old prompt selection — fresh start.
    await supabase.from("reflection_prompts").delete().eq("reflection_id", existing.id)
  } else {
    const { data: created, error: insertErr } = await supabase
      .from("weekly_reflections")
      .insert({
        user_id: userId,
        week_start: monday,
        week_number: parsed.week,
        year: parsed.year,
        is_active: true,
      })
      .select("id")
      .single()
    if (insertErr || !created) {
      redirect(
        `/reflections/new?error=${encodeURIComponent(insertErr?.message ?? "Insert failed.")}`
      )
    }
    reflectionId = created.id
  }

  // Insert the prompt selection.
  const { error: pickErr } = await supabase.from("reflection_prompts").insert(
    promptIds.map((prompt_id) => ({
      reflection_id: reflectionId,
      prompt_id,
      user_id: userId,
    }))
  )
  if (pickErr) {
    redirect(
      `/reflections/${reflectionId}?warning=${encodeURIComponent(`Prompt selection failed: ${pickErr.message}`)}`
    )
  }

  revalidatePath("/reflections")
  revalidatePath("/")
  redirect(`/reflections/${reflectionId}`)
}

// ─── saveResponse ──────────────────────────────────────────────────────────────

export async function saveResponse(
  reflectionId: string,
  promptId: string,
  formData: FormData
) {
  const { supabase, userId } = await requireUser()

  const body = String(formData.get("body") ?? "").trim()
  const moodRaw = String(formData.get("mood") ?? "").trim()
  const mood = moodRaw === "" ? null : Number(moodRaw)
  const tags = parseTags(String(formData.get("tags") ?? ""))

  const detailPath = `/reflections/${reflectionId}`

  if (!body) {
    redirect(`${detailPath}?error=${encodeURIComponent("Response body required.")}`)
  }
  if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 5)) {
    redirect(`${detailPath}?error=${encodeURIComponent("Mood must be an integer 1-5.")}`)
  }

  const { data: response, error: upsertErr } = await supabase
    .from("reflection_responses")
    .upsert(
      {
        user_id: userId,
        reflection_id: reflectionId,
        prompt_id: promptId,
        body,
        mood,
      },
      { onConflict: "reflection_id,prompt_id" }
    )
    .select("id")
    .single()

  if (upsertErr || !response) {
    redirect(`${detailPath}?error=${encodeURIComponent(upsertErr?.message ?? "Save failed.")}`)
  }

  try {
    await syncResponseTags(supabase, userId, response.id, tags)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tag sync failed."
    redirect(`${detailPath}?warning=${encodeURIComponent(msg)}`)
  }

  revalidatePath(detailPath)
  revalidatePath("/reflections")
  revalidatePath("/")
  redirect(detailPath)
}

// ─── deleteResponse ────────────────────────────────────────────────────────────

export async function deleteResponse(formData: FormData) {
  const { supabase } = await requireUser()
  const responseId = String(formData.get("response_id") ?? "")
  const reflectionId = String(formData.get("reflection_id") ?? "")
  if (!responseId || !reflectionId) {
    redirect(`/reflections?error=${encodeURIComponent("Missing response or reflection id.")}`)
  }

  const { error } = await supabase
    .from("reflection_responses")
    .delete()
    .eq("id", responseId)

  const detailPath = `/reflections/${reflectionId}`
  if (error) {
    redirect(`${detailPath}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(detailPath)
  revalidatePath("/reflections")
  revalidatePath("/")
  redirect(detailPath)
}

// ─── terminateReflection ───────────────────────────────────────────────────────

export async function terminateReflection(formData: FormData) {
  const { supabase } = await requireUser()
  const reflectionId = String(formData.get("reflection_id") ?? "")
  if (!reflectionId) {
    redirect(`/reflections?error=${encodeURIComponent("Missing reflection id.")}`)
  }

  const { error, data } = await supabase
    .from("weekly_reflections")
    .update({ is_active: false })
    .eq("id", reflectionId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(
      `/reflections?error=${encodeURIComponent(error?.message ?? "Reflection not found.")}`
    )
  }

  revalidatePath("/reflections")
  revalidatePath("/")
  redirect("/reflections")
}
