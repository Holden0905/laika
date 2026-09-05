"use client"

import { useState } from "react"
import { CornerMarks, StatusDot } from "@/components/ui/schematic"

type CopyState = "idle" | "copied" | "failed"

/**
 * Copies the trajectory as markdown — byte-identical to what the export
 * produces — so it can be pasted straight into the vault or a chat.
 *
 * navigator.clipboard only exists in a secure context. Laika is served over
 * plain http on the LAN/Tailscale address, so the async API is usually
 * unavailable here and the execCommand path is the one that actually runs.
 * Both are kept: the modern API takes over if Rio ever gets TLS.
 */
export function CopyContextButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<CopyState>("idle")

  async function copy() {
    const ok = (await tryAsyncClipboard(markdown)) || legacyCopy(markdown)
    setState(ok ? "copied" : "failed")
    window.setTimeout(() => setState("idle"), 2400)
  }

  const label =
    state === "copied"
      ? "Context Copied"
      : state === "failed"
        ? "Copy Failed — Select Manually"
        : "Copy Context"
  const color =
    state === "copied"
      ? "var(--phosphor)"
      : state === "failed"
        ? "var(--red)"
        : "var(--line)"

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="relative flex items-center gap-2 border border-line-dim px-3 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-line-mid"
      style={{ color }}
    >
      <CornerMarks />
      <StatusDot
        active={state !== "idle"}
        color={state === "failed" ? "var(--red)" : "var(--phosphor)"}
      />
      {label}
    </button>
  )
}

async function tryAsyncClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Insecure-context fallback: off-screen textarea + execCommand("copy"). */
function legacyCopy(text: string): boolean {
  try {
    const el = document.createElement("textarea")
    el.value = text
    el.setAttribute("readonly", "")
    el.style.position = "fixed"
    el.style.top = "-1000px"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
