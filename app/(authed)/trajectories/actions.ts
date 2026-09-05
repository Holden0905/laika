"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseTags } from "@/lib/journal/format"
import { syncTrajectoryTags } from "@/lib/tags/sync"
import { isTrajectoryStatus } from "@/lib/trajectories/format"

const TITLE_MAX = 300
const SUMMARY_MAX = 500
const LOG_MAX = 20000

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, userId: user.id }
}

function listError(message: string): never {
  redirect(`/trajectories?error=${encodeURIComponent(message)}`)
}

function detailError(id: string, message: string): never {
  redirect(`/trajectories/${id}?error=${encodeURIComponent(message)}`)
}

/** Revalidate everything a trajectory change can be visible from. */
function revalidateTrajectory(id: string) {
  revalidatePath("/trajectories")
  revalidatePath(`/trajectories/${id}`)
  revalidatePath("/")
}

export async function createTrajectory(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const title = String(formData.get("title") ?? "").trim()
  const summaryRaw = String(formData.get("summary") ?? "").trim()
  const summary = summaryRaw.length > 0 ? summaryRaw : null

  if (!title) listError("Trajectory title required.")
  if (title.length > TITLE_MAX) {
    listError(`Title must be ${TITLE_MAX} characters or less.`)
  }
  if (summary && summary.length > SUMMARY_MAX) {
    listError(`Summary must be ${SUMMARY_MAX} characters or less.`)
  }

  const { error } = await supabase.from("trajectories").insert({
    user_id: userId,
    title,
    summary,
    status: "DORMANT",
    is_active: true,
  })

  if (error) listError(error.message)

  revalidatePath("/trajectories")
  revalidatePath("/")
  redirect("/trajectories")
}

/** Title / summary / tags. Status has its own control so it can be a one-click change. */
export async function updateTrajectoryDetails(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("trajectory_id") ?? "")
  if (!id) listError("Missing trajectory id.")

  const title = String(formData.get("title") ?? "").trim()
  const summaryRaw = String(formData.get("summary") ?? "").trim()
  const summary = summaryRaw.length > 0 ? summaryRaw : null
  const tags = parseTags(String(formData.get("tags") ?? ""))

  if (!title) detailError(id, "Trajectory title required.")
  if (title.length > TITLE_MAX) {
    detailError(id, `Title must be ${TITLE_MAX} characters or less.`)
  }
  if (summary && summary.length > SUMMARY_MAX) {
    detailError(id, `Summary must be ${SUMMARY_MAX} characters or less.`)
  }

  const { error, data } = await supabase
    .from("trajectories")
    .update({ title, summary })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    detailError(id, error?.message ?? "Trajectory not found.")
  }

  try {
    await syncTrajectoryTags(supabase, userId, id, tags)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tag sync failed."
    detailError(id, msg)
  }

  revalidateTrajectory(id)
  redirect(`/trajectories/${id}`)
}

export async function setTrajectoryStatus(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("trajectory_id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (!id) listError("Missing trajectory id.")
  if (!isTrajectoryStatus(status)) {
    detailError(id, "Unrecognized status.")
  }

  const { error, data } = await supabase
    .from("trajectories")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    detailError(id, error?.message ?? "Trajectory not found.")
  }

  revalidateTrajectory(id)
  redirect(`/trajectories/${id}`)
}

/**
 * Append a log entry. The DB trigger pushes last_contact_at forward — we never
 * write that column from the app, so the two can't drift.
 */
export async function addLogEntry(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("trajectory_id") ?? "")
  const body = String(formData.get("body") ?? "").trim()

  if (!id) listError("Missing trajectory id.")
  if (!body) detailError(id, "Log entry cannot be empty.")
  if (body.length > LOG_MAX) {
    detailError(id, `Log entry must be ${LOG_MAX} characters or less.`)
  }

  const { error } = await supabase.from("trajectory_log").insert({
    user_id: userId,
    trajectory_id: id,
    body,
  })

  if (error) detailError(id, error.message)

  revalidateTrajectory(id)
  redirect(`/trajectories/${id}`)
}

/** Quick-add a directive already attached to this trajectory. */
export async function attachDirective(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("trajectory_id") ?? "")
  const title = String(formData.get("title") ?? "").trim()

  if (!id) listError("Missing trajectory id.")
  if (!title) detailError(id, "Directive title required.")
  if (title.length > TITLE_MAX) {
    detailError(id, `Directive must be ${TITLE_MAX} characters or less.`)
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title,
    trajectory_id: id,
    is_complete: false,
    is_active: true,
  })

  if (error) detailError(id, error.message)

  revalidateTrajectory(id)
  revalidatePath("/directives")
  redirect(`/trajectories/${id}`)
}

/** ABANDONED is a status, not a delete — the trajectory stays readable and exportable. */
export async function abandonTrajectory(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("trajectory_id") ?? "")
  if (!id) listError("Missing trajectory id.")

  const { error, data } = await supabase
    .from("trajectories")
    .update({ status: "ABANDONED" })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    detailError(id, error?.message ?? "Trajectory not found.")
  }

  revalidateTrajectory(id)
  redirect(`/trajectories/${id}`)
}

/** Soft delete — drops off every list, row and log preserved. */
export async function archiveTrajectory(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("trajectory_id") ?? "")
  if (!id) listError("Missing trajectory id.")

  const { error, data } = await supabase
    .from("trajectories")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    detailError(id, error?.message ?? "Trajectory not found.")
  }

  revalidateTrajectory(id)
  redirect("/trajectories")
}
