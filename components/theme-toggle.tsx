"use client"

import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"
import { StatusDot } from "@/components/ui/schematic"

const STORAGE_KEY = "laika-theme"

type Theme = "dark" | "light"

/**
 * Subscribe to changes on <html class="dark"> via MutationObserver. Using
 * useSyncExternalStore over useEffect+useState keeps this within the React 19
 * "no setState in effects" rule — the class on documentElement IS the source of
 * truth (set both by the no-flash init script and by toggle clicks here).
 */
function subscribe(callback: () => void) {
  if (typeof document === "undefined") return () => {}
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function getServerSnapshot(): Theme {
  return "dark"
}

function applyTheme(next: Theme) {
  if (next === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // localStorage may throw in private mode; the in-memory class still flips.
  }
}

export function ThemeToggle({
  className,
  variant = "compact",
}: {
  className?: string
  /** "compact" = nav button. "row" = full-width settings row for the mobile drawer. */
  variant?: "compact" | "row"
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const isDark = theme === "dark"
  const next: Theme = isDark ? "light" : "dark"
  const currentLabel = isDark ? "Void" : "Blueprint"

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => applyTheme(next)}
        aria-label={`Switch to ${next} mode`}
        className={cn(
          "relative flex w-full items-center justify-between border border-line-dim px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-mid hover:text-amber",
          className
        )}
      >
        <span>Display Mode</span>
        <span className="flex items-center gap-2">
          <span>{currentLabel}</span>
          <StatusDot active color={isDark ? "var(--phosphor)" : "var(--amber)"} />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className={cn(
        "flex items-center gap-2 border border-transparent px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber",
        className
      )}
    >
      <span>{currentLabel}</span>
      <StatusDot active color={isDark ? "var(--phosphor)" : "var(--amber)"} />
    </button>
  )
}
