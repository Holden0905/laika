import { cn } from "@/lib/utils"

/** Read-only 5-segment mood indicator. Returns null when no mood is set. */
export function MoodBar({
  value,
  max = 5,
  className,
}: {
  value: number | null | undefined
  max?: number
  className?: string
}) {
  if (value == null) return null
  return (
    <div className={cn("flex items-center gap-[2px]", className)} aria-label={`Mood ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="h-[3px] w-[12px]"
          style={{
            background: i < value ? "var(--phosphor)" : "var(--line-ghost)",
            opacity: i < value ? 0.7 : 1,
          }}
        />
      ))}
    </div>
  )
}
