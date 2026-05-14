import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Registration marks at the four corners of a container — the schematic
 * "this is a measured artifact" signal. Always rendered inside a `relative` parent.
 */
export function CornerMarks({ className }: { className?: string }) {
  const base = "pointer-events-none absolute h-[6px] w-[6px] border-line-mid"
  return (
    <>
      <span className={cn(base, "top-0 left-0 border-t border-l", className)} aria-hidden />
      <span className={cn(base, "top-0 right-0 border-t border-r", className)} aria-hidden />
      <span className={cn(base, "bottom-0 left-0 border-b border-l", className)} aria-hidden />
      <span className={cn(base, "bottom-0 right-0 border-b border-r", className)} aria-hidden />
    </>
  )
}

/** Container with corner marks pre-applied. */
export function Panel({
  className,
  children,
  padded = true,
}: {
  className?: string
  children: React.ReactNode
  padded?: boolean
}) {
  return (
    <div className={cn("relative", padded && "p-6", className)}>
      <CornerMarks />
      {children}
    </div>
  )
}

/** 8px crosshair used to anchor section headers. */
export function Crosshair({ size = 8, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <line x1="4" y1="0" x2="4" y2="8" stroke="var(--amber-dim)" strokeWidth="0.5" />
      <line x1="0" y1="4" x2="8" y2="4" stroke="var(--amber-dim)" strokeWidth="0.5" />
      <circle cx="4" cy="4" r="2" fill="none" stroke="var(--amber-dim)" strokeWidth="0.5" />
    </svg>
  )
}

/** 9px uppercase metadata label in amber-dim. */
export function Label({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "text-[9px] font-normal uppercase tracking-[0.14em] text-amber-dim",
        className
      )}
    >
      {children}
    </span>
  )
}

/** Section header: crosshair + label + ghost rule extending to fill remaining width. */
export function SectionHeader({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Crosshair />
      <Label>{label}</Label>
      <span className="h-px flex-1 bg-line-ghost" aria-hidden />
    </div>
  )
}

/**
 * Tick-mark ruler. Every 10th tick is taller and amber-dim, every 5th is mid-height.
 * Used as a measurement-scale divider.
 */
export function Ruler({ count = 40, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex items-end gap-[2px]", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const major = i % 10 === 0
        const half = !major && i % 5 === 0
        return (
          <span
            key={i}
            className="w-[2px]"
            style={{
              height: major ? 8 : half ? 5 : 3,
              background: major ? "var(--amber-dim)" : "var(--line-dim)",
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * 14px schematic checkbox indicator. Visual only — pair with a real
 * <input type="checkbox"> or a button that toggles state externally.
 */
export function CheckIndicator({
  checked,
  size = 14,
  className,
}: {
  checked: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center border transition-all", className)}
      style={{
        width: size,
        height: size,
        borderColor: checked ? "var(--phosphor)" : "var(--line-dim)",
        background: checked ? "var(--phosphor)" : "transparent",
        boxShadow: checked ? "0 0 8px rgba(58,189,111,0.22)" : "none",
      }}
      aria-hidden
    >
      {checked ? (
        <span
          className="font-extrabold leading-none text-void"
          style={{ fontSize: Math.round(size * 0.6) }}
        >
          ✓
        </span>
      ) : null}
    </span>
  )
}

/**
 * 5px status dot.
 *   - active=true: filled with `color` (default phosphor) + subtle glow.
 *   - active=false: outlined in line-dim.
 */
export function StatusDot({
  active = true,
  color = "var(--phosphor)",
  className,
}: {
  active?: boolean
  color?: string
  className?: string
}) {
  return (
    <span
      className={cn("inline-block h-[5px] w-[5px] rounded-full", className)}
      style={{
        background: active ? color : "transparent",
        border: active ? "none" : `1px solid var(--line-dim)`,
        boxShadow: active ? `0 0 6px ${color}33` : "none",
      }}
      aria-hidden
    />
  )
}
