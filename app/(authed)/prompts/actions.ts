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

export async function createPrompt(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const text = String(formData.get("text") ?? "").trim()

  if (!text) {
    redirect(`/prompts?error=${encodeURIComponent("Prompt text required.")}`)
  }
  if (text.length > 300) {
    redirect(`/prompts?error=${encodeURIComponent("Prompt must be 300 characters or less.")}`)
  }

  const { error } = await supabase.from("prompts").insert({
    user_id: userId,
    text,
    is_active: true,
  })

  if (error) {
    redirect(`/prompts?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/prompts")
  revalidatePath("/reflections")
  redirect("/prompts")
}

export async function retirePrompt(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("prompt_id") ?? "")
  if (!id) redirect("/prompts?error=Missing+prompt+id")

  const { error, data } = await supabase
    .from("prompts")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(`/prompts?error=${encodeURIComponent(error?.message ?? "Prompt not found.")}`)
  }

  revalidatePath("/prompts")
  revalidatePath("/reflections")
  redirect("/prompts")
}

export async function reactivatePrompt(formData: FormData) {
  const { supabase } = await requireUser()
  const id = String(formData.get("prompt_id") ?? "")
  if (!id) redirect("/prompts?error=Missing+prompt+id")

  const { error, data } = await supabase
    .from("prompts")
    .update({ is_active: true })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    redirect(`/prompts?error=${encodeURIComponent(error?.message ?? "Prompt not found.")}`)
  }

  revalidatePath("/prompts")
  revalidatePath("/reflections")
  redirect("/prompts")
}
