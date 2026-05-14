"use client"

import { useState } from "react"
import { parseTags } from "@/lib/journal/format"
import { TagPill } from "./tag-pill"

/**
 * Single text input that accepts comma-separated tags. Live preview of normalized
 * tags appears below as you type. The raw string is what gets posted; the server
 * action re-parses with the same normalizer.
 */
export function TagInput({
  name,
  defaultValue,
}: {
  name: string
  defaultValue?: string
}) {
  const [raw, setRaw] = useState(defaultValue ?? "")
  const parsed = parseTags(raw)

  return (
    <div className="flex flex-col gap-2">
      <input
        name={name}
        type="text"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="writing, recovery, minsky"
        className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
      />
      {parsed.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {parsed.map((t) => (
            <TagPill key={t} name={t} />
          ))}
        </div>
      ) : (
        <p className="text-[9px] tracking-[0.14em] text-amber-dim/70">
          COMMA-SEPARATED · WILL BE NORMALIZED TO LOWERCASE-HYPHENATED
        </p>
      )}
    </div>
  )
}
