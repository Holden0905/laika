/**
 * Web Speech API dictation — capability detection and text insertion.
 *
 * SECURE CONTEXT: browsers gate the microphone behind a secure context, so
 * SpeechRecognition only works on https:// or http://localhost. Laika is served
 * over plain http on a private IP, where recognition fails with `not-allowed`
 * before it ever starts. We detect that up front and say so, rather than
 * letting the mic button look broken. See CLAUDE.md → Infrastructure Gotchas.
 *
 * No types are declared globally: TypeScript's DOM lib has added SpeechRecognition
 * in some versions, and a `declare global` here would collide. Local shapes + a
 * cast at the single access point instead.
 */

export type SpeechRecognitionAlternative = { transcript: string; confidence: number }

export type SpeechRecognitionResult = {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

export type SpeechRecognitionResultList = {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

export type SpeechRecognitionEventLike = {
  resultIndex: number
  results: SpeechRecognitionResultList
}

export type SpeechRecognitionErrorEventLike = {
  error: string
  message?: string
}

export type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

/** Chrome/Safari ship this prefixed; the unprefixed name is the standard. */
export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type DictationAvailability =
  | { available: true }
  | { available: false; reason: "insecure-context" | "unsupported"; message: string }

/**
 * Why this checks the secure context BEFORE the API's presence: on http, Chrome
 * and Safari still expose webkitSpeechRecognition. It constructs fine, start()
 * resolves, and then it errors out. Checking isSecureContext first turns a
 * confusing runtime failure into an accurate up-front explanation.
 *
 * localhost and 127.0.0.1 count as secure, so dev on the workstation works.
 */
export function detectDictation(): DictationAvailability {
  if (typeof window === "undefined") {
    return { available: false, reason: "unsupported", message: "No browser context." }
  }
  if (!window.isSecureContext) {
    return {
      available: false,
      reason: "insecure-context",
      message:
        "Dictation needs a secure context (https or localhost). This page is served over http, so the browser blocks microphone access.",
    }
  }
  if (!getSpeechRecognitionCtor()) {
    return {
      available: false,
      reason: "unsupported",
      message: "This browser has no Web Speech API. Try Safari or Chrome.",
    }
  }
  return { available: true }
}

/** Human-readable copy for a SpeechRecognitionErrorEvent.error code. */
export function describeSpeechError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission denied. Allow mic access for this site, then try again."
    case "audio-capture":
      return "No microphone found."
    case "network":
      return "Speech service unreachable. Recognition needs a network connection."
    case "language-not-supported":
      return "This language is not supported for dictation."
    case "no-speech":
      return "No speech detected."
    case "aborted":
      return "Dictation stopped."
    default:
      return `Dictation error: ${code}`
  }
}

/** Errors that mean "stop trying" rather than "restart and keep listening". */
export function isFatalSpeechError(code: string): boolean {
  return (
    code === "not-allowed" ||
    code === "service-not-allowed" ||
    code === "audio-capture" ||
    code === "language-not-supported"
  )
}

export type DictationTarget = HTMLInputElement | HTMLTextAreaElement

/**
 * Write a value the way React's onChange can see. React tracks the last value it
 * set on the node; assigning .value directly leaves that tracker stale and the
 * change event is swallowed. Going through the prototype setter clears it.
 * Harmless for the uncontrolled fields here, and correct if one ever becomes controlled.
 */
function setNativeValue(el: DictationTarget, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

/**
 * Caret and spacing math, split out from the DOM so it can be tested directly.
 * Inserts `text` over [start, end), adding a separating space when the preceding
 * character isn't already whitespace, and reports where the caret lands.
 * Returns null when there is nothing to insert.
 */
export function composeInsertion(
  value: string,
  start: number,
  end: number,
  text: string
): { value: string; caret: number } | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const from = Math.max(0, Math.min(start, value.length))
  const to = Math.max(from, Math.min(end, value.length))
  const before = value.slice(0, from)
  const after = value.slice(to)

  const needsLeadingSpace = before.length > 0 && !/\s$/.test(before)
  const insertion = (needsLeadingSpace ? " " : "") + trimmed

  return { value: before + insertion + after, caret: from + insertion.length }
}

/**
 * Append transcribed text at the caret (replacing any selection).
 * Leaves the caret after the inserted text so successive phrases flow on.
 */
export function insertAtCursor(el: DictationTarget, text: string) {
  const value = el.value
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? start

  const next = composeInsertion(value, start, end, text)
  if (!next) return

  setNativeValue(el, next.value)
  el.setSelectionRange(next.caret, next.caret)
}
