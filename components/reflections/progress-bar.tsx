/** Phosphor progress bar — line-ghost track with phosphor fill + subtle glow. */
export function ReflectionProgressBar({
  answered,
  total,
  showLabel = true,
}: {
  answered: number
  total: number
  showLabel?: boolean
}) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-[2px] flex-1 bg-line-ghost">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: "var(--phosphor)",
            boxShadow: "0 0 6px rgba(58,189,111,0.3)",
          }}
        />
      </div>
      {showLabel ? (
        <span className="text-[9px] tracking-[0.04em] text-amber-dim">{pct}%</span>
      ) : null}
    </div>
  )
}
