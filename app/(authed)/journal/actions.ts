"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { parseTags } from "@/lib/journal/format"
import { PHOTO_BUCKET } from "@/lib/journal/photos"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, userId: user.id }
}

type Fields = {
  title: string | null
  body: string
  entry_date: string
  mood: number | null
  tags: string[]
}

function parseFields(formData: FormData): Fields {
  const title = String(formData.get("title") ?? "").trim() || null
  const body = String(formData.get("body") ?? "").trim()
  const entry_date = String(formData.get("entry_date") ?? "").trim()
  const moodRaw = String(formData.get("mood") ?? "").trim()
  const mood = moodRaw === "" ? null : Number(moodRaw)
  const tags = parseTags(String(formData.get("tags") ?? ""))
  return { title, body, entry_date, mood, tags }
}

function validate(f: Fields): string | null {
  if (!f.body) return "Body required."
  if (!f.entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(f.entry_date)) return "Date required (YYYY-MM-DD)."
  if (f.mood !== null && (!Number.isInteger(f.mood) || f.mood < 1 || f.mood > 5)) {
    return "Mood must be an integer 1-5."
  }
  return null
}

/**
 * Insert any missing tag rows, then return the full set of (id, name) for the given names.
 * Two-step (upsert ignore + select) avoids needlessly updating existing rows.
 */
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

async function syncEntryTags(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  names: string[]
) {
  // Replace strategy: clear existing junctions, insert fresh.
  const { error: delErr } = await supabase
    .from("entry_tags")
    .delete()
    .eq("entry_id", entryId)
  if (delErr) throw new Error(`Junction clear failed: ${delErr.message}`)

  const tagRows = await ensureTags(supabase, userId, names)
  if (tagRows.length === 0) return
  const { error: insErr } = await supabase
    .from("entry_tags")
    .insert(
      tagRows.map((t) => ({ entry_id: entryId, tag_id: t.id, user_id: userId }))
    )
  if (insErr) throw new Error(`Junction insert failed: ${insErr.message}`)
}

export async function createEntry(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const fields = parseFields(formData)
  const validationError = validate(fields)
  if (validationError) {
    redirect(`/journal/new?error=${encodeURIComponent(validationError)}`)
  }

  // Client may pre-generate the entry_id so it can direct-upload photos to
  // {user_id}/{entry_id}/{filename} before the entry row exists. We validate
  // it's a UUID; the photo_paths must all live under that entry_id folder.
  const providedEntryId = String(formData.get("entry_id") ?? "").trim()
  const entryId = UUID_RE.test(providedEntryId) ? providedEntryId : undefined

  const photoPaths = formData
    .getAll("photo_paths")
    .map((v) => String(v).trim())
    .filter(Boolean)
  if (entryId) {
    const prefix = `${userId}/${entryId}/`
    for (const p of photoPaths) {
      if (!p.startsWith(prefix)) {
        redirect(
          `/journal/new?error=${encodeURIComponent("Photo path does not match this entry.")}`
        )
      }
    }
  }

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    title: fields.title,
    body: fields.body,
    mood: fields.mood,
    entry_date: fields.entry_date,
  }
  if (entryId) insertPayload.id = entryId

  const { data: entry, error: insertErr } = await supabase
    .from("entries")
    .insert(insertPayload)
    .select("id")
    .single()

  if (insertErr || !entry) {
    redirect(`/journal/new?error=${encodeURIComponent(insertErr?.message ?? "Insert failed.")}`)
  }

  try {
    await syncEntryTags(supabase, userId, entry.id, fields.tags)
  } catch (err) {
    revalidatePath("/journal")
    const msg = err instanceof Error ? err.message : "Tag sync failed."
    redirect(`/journal/${entry.id}?warning=${encodeURIComponent(msg)}`)
  }

  if (photoPaths.length > 0) {
    const { error: photoErr } = await supabase.from("entry_photos").insert(
      photoPaths.map((path) => ({
        entry_id: entry.id,
        user_id: userId,
        storage_path: path,
      }))
    )
    if (photoErr) {
      revalidatePath("/journal")
      redirect(
        `/journal/${entry.id}?warning=${encodeURIComponent(`Photo link failed: ${photoErr.message}`)}`
      )
    }
  }

  revalidatePath("/journal")
  revalidatePath("/")
  redirect(`/journal/${entry.id}`)
}

export async function updateEntry(entryId: string, formData: FormData) {
  const { supabase, userId } = await requireUser()
  const fields = parseFields(formData)
  const validationError = validate(fields)
  if (validationError) {
    redirect(`/journal/${entryId}/edit?error=${encodeURIComponent(validationError)}`)
  }

  const { error: updateErr, data: updated } = await supabase
    .from("entries")
    .update({
      title: fields.title,
      body: fields.body,
      mood: fields.mood,
      entry_date: fields.entry_date,
    })
    .eq("id", entryId)
    .select("id")
    .maybeSingle()

  if (updateErr || !updated) {
    redirect(
      `/journal/${entryId}/edit?error=${encodeURIComponent(updateErr?.message ?? "Entry not found.")}`
    )
  }

  try {
    await syncEntryTags(supabase, userId, entryId, fields.tags)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tag sync failed."
    redirect(`/journal/${entryId}?warning=${encodeURIComponent(msg)}`)
  }

  revalidatePath("/journal")
  revalidatePath(`/journal/${entryId}`)
  revalidatePath("/")
  redirect(`/journal/${entryId}`)
}

/**
 * Record a photo that the client has already uploaded to storage.
 * The path is validated to live under {user_id}/{entry_id}/... so the row
 * insert can only ever point at the user's own storage objects.
 */
export async function addEntryPhoto(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const entryId = String(formData.get("entry_id") ?? "").trim()
  const storagePath = String(formData.get("storage_path") ?? "").trim()

  if (!entryId || !UUID_RE.test(entryId)) {
    return { error: "Invalid entry id." }
  }
  const expectedPrefix = `${userId}/${entryId}/`
  if (!storagePath.startsWith(expectedPrefix)) {
    return { error: "Photo path does not match this entry." }
  }

  // Confirm the entry exists and belongs to the user (RLS does this implicitly,
  // but we want a friendly error message rather than a FK violation).
  const { data: entry } = await supabase
    .from("entries")
    .select("id")
    .eq("id", entryId)
    .eq("is_active", true)
    .maybeSingle()
  if (!entry) return { error: "Entry not found." }

  const { data, error } = await supabase
    .from("entry_photos")
    .insert({
      entry_id: entryId,
      user_id: userId,
      storage_path: storagePath,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Insert failed." }
  }

  revalidatePath(`/journal/${entryId}`)
  revalidatePath(`/journal/${entryId}/edit`)
  return { id: data.id }
}

/**
 * Remove a photo: deletes the entry_photos row and the storage object.
 * Storage delete is best-effort — if the row delete succeeds but the storage
 * remove fails, we orphan a file. Logged as a soft error to the caller.
 */
export async function deleteEntryPhoto(formData: FormData) {
  const { supabase } = await requireUser()
  const photoId = String(formData.get("photo_id") ?? "").trim()
  if (!photoId || !UUID_RE.test(photoId)) {
    return { error: "Invalid photo id." }
  }

  const { data: photo, error: fetchErr } = await supabase
    .from("entry_photos")
    .select("id, entry_id, storage_path")
    .eq("id", photoId)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr.message }
  if (!photo) return { error: "Photo not found." }

  const { error: delErr } = await supabase
    .from("entry_photos")
    .delete()
    .eq("id", photoId)
  if (delErr) return { error: delErr.message }

  // Best-effort storage cleanup. Row is already gone either way.
  const { error: storageErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([photo.storage_path])

  revalidatePath(`/journal/${photo.entry_id}`)
  revalidatePath(`/journal/${photo.entry_id}/edit`)
  return storageErr ? { warning: `Row removed; storage cleanup failed: ${storageErr.message}` } : {}
}

export async function deleteEntry(formData: FormData) {
  const { supabase } = await requireUser()
  const entryId = String(formData.get("entry_id") ?? "")
  if (!entryId) redirect("/journal?error=Missing+entry+id")

  const { error, data } = await supabase
    .from("entries")
    .update({ is_active: false })
    .eq("id", entryId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(
      `/journal?error=${encodeURIComponent(error?.message ?? "Entry not found.")}`
    )
  }

  revalidatePath("/journal")
  revalidatePath("/")
  redirect("/journal")
}
