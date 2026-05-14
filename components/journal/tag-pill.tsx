import { cn } from "@/lib/utils"

/** Renders a tag as [[tag-name]] — amber on amber-dim border, matches Obsidian wiki-link style. */
export function TagPill({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "border border-amber-dim px-[6px] py-[2px] text-[9px] tracking-[0.04em] text-amber opacity-70",
        className
      )}
    >
      [[{name}]]
    </span>
  )
}
