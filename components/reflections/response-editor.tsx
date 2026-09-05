"use client"

import { useId, useState } from "react"
import { CheckIndicator, CornerMarks, Crosshair, Label, StatusDot } from "@/components/ui/schematic"
import { MoodSelector } from "@/components/journal/mood-selector"
import { MoodBar } from "@/components/journal/mood-bar"
import { TagInput } from "@/components/journal/tag-input"
import { TagPill } from "@/components/journal/tag-pill"
import { DictationButton } from "@/components/ui/dictation-button"
import { padPromptNumber } from "@/lib/prompts/format"
import { DeleteResponseButton } from "./delete-response-button"

export type ExistingResponse = {
  id: string
  body: string
  mood: number | null
  tags: string[]
}

/**
 * One row per prompt in a reflection. Three render modes:
 *   - No response yet → form (textarea + mood + tags + save).
 *   - Response saved → read-only display + Edit / Delete buttons.
 *   - Editing existing response → form pre-filled, with Save / Cancel.
 *
 * Save action is bound at the parent: saveResponse.bind(null, reflectionId, promptId).
 */
export function ResponseEditor({
  promptNumber,
  promptText,
  promptIsRetired,
  response,
  saveAction,
  reflectionId,
}: {
  promptNumber: number
  promptText: string
  promptIsRetired: boolean
  response: ExistingResponse | null
  saveAction: (formData: FormData) => Promise<void>
  reflectionId: string
}) {
  const isAnswered = response !== null
  // One editor per prompt on the page, so the textarea id has to be unique.
  const bodyId = `response-body-${useId()}`
  const [editing, setEditing] = useState(false)
  const showForm = !isAnswered || editing

  return (
    <div className="relative border border-line-dim p-4">
      <CornerMarks />

      {/* Prompt header */}
      <div className="flex items-start gap-3">
        <CheckIndicator checked={isAnswered} className="mt-[2px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] tracking-[0.12em] text-amber-dim">
              P-{padPromptNumber(promptNumber)}
            </span>
            {promptIsRetired ? (
              <span className="border border-line-ghost px-2 py-[1px] text-[8px] tracking-[0.12em] text-line-dim">
                RETIRED
              </span>
            ) : null}
          </div>
          <p
            className={`text-[13px] leading-snug tracking-[0.02em] ${
              isAnswered ? "text-line-mid" : "text-line"
            }`}
          >
            {promptText}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 pl-[26px]">
        {showForm ? (
          <form action={saveAction} className="flex flex-col gap-4">
            <div className="flex justify-end">
              <DictationButton targetId={bodyId} fieldLabel="this response" />
            </div>
            <textarea
              id={bodyId}
              name="body"
              required
              rows={5}
              defaultValue={response?.body ?? ""}
              placeholder="Begin response…"
              className="resize-y border border-line-dim bg-transparent p-3 text-[12px] leading-relaxed tracking-[0.02em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Crosshair />
                <Label>Mood (Optional)</Label>
              </div>
              <MoodSelector name="mood" defaultValue={response?.mood ?? null} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Crosshair />
                <Label>Tags (Optional)</Label>
              </div>
              <TagInput name="tags" defaultValue={response?.tags?.join(", ") ?? ""} />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="relative flex items-center gap-3 border border-line-dim px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
              >
                <CornerMarks />
                <span>{isAnswered ? "Save Changes" : "Save Response"}</span>
                <StatusDot active />
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="border border-transparent px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed tracking-[0.02em] text-line">
              {response!.body}
            </pre>

            {response!.mood !== null || response!.tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <MoodBar value={response!.mood} />
                {response!.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-[6px]">
                    {response!.tags.map((t) => (
                      <TagPill key={t} name={t} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="border border-line-dim px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid"
              >
                Edit Response
              </button>
              <DeleteResponseButton
                responseId={response!.id}
                reflectionId={reflectionId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
