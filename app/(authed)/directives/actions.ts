"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, userId: user.id }
}

export async function createDirective(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const title = String(formData.get("title") ?? "").trim()
  const descriptionRaw = String(formData.get("description") ?? "").trim()
  const description = descriptionRaw.length > 0 ? descriptionRaw : null

  if (!title) {
    redirect(`/directives?error=${encodeURIComponent("Directive title required.")}`)
  }
  if (title.length > 300) {
    redirect(`/directives?error=${encodeURIComponent("Directive must be 300 characters or less.")}`)
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title,
    description,
    is_complete: false,
    is_active: true,
  })

  if (error) {
    redirect(`/directives?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/directives")
  redirect("/directives")
}

export async function completeDirective(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("task_id") ?? "")
  if (!id) redirect("/directives?error=Missing+directive+id")

  const { error, data } = await supabase
    .from("tasks")
    .update({ is_complete: true, completed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(`/directives?error=${encodeURIComponent(error?.message ?? "Directive not found.")}`)
  }

  revalidatePath("/directives")
  redirect("/directives")
}

export async function reopenDirective(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("task_id") ?? "")
  if (!id) redirect("/directives?error=Missing+directive+id")

  const { error, data } = await supabase
    .from("tasks")
    .update({ is_complete: false, completed_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(`/directives?error=${encodeURIComponent(error?.message ?? "Directive not found.")}`)
  }

  revalidatePath("/directives")
  redirect("/directives")
}

export async function archiveDirective(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("task_id") ?? "")
  if (!id) redirect("/directives?error=Missing+directive+id")

  const { error, data } = await supabase
    .from("tasks")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(`/directives?error=${encodeURIComponent(error?.message ?? "Directive not found.")}`)
  }

  revalidatePath("/directives")
  redirect("/directives")
}
