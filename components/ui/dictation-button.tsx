"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { CornerMarks } from "@/components/ui/schematic"
import {
  type DictationAvailability,
  describeSpeechError,
  detectDictation,
  getSpeechRecognitionCtor,
  insertAtCursor,
  isFatalSpeechError,
  type DictationTarget,
  type SpeechRecognitionLike,
} from "@/lib/speech/dictation"

type Status = "checking" | "idle" | "listening" | "error" | "blocked"

/**
 * Availability is fixed for the life of the page (secure context and API
 * presence don't change), so it's cached module-side. useSyncExternalStore
 * reads it without a state-setting effect, and the server snapshot of `null`
 * makes the first client render match the server's.
 */
let cachedAvailability: DictationAvailability | null = null

function subscribeToAvailability() {
  return () => {}
}

function getClientAvailability(): DictationAvailability {
  if (!cachedAvailability) cachedAvailability = detectDictation()
  return cachedAvailability
}

function getServerAvailability(): null {
  return null
}

/**
 * Voice input for a single text field. `targetId` is the DOM id of the input or
 * textarea it dictates into — resolved at click time so it works with fields
 * rendered by server components.
 *
 * Continuous + interim results: finals are committed at the caret as they land,
 * interim text shows as a live preview underneath. Recognition is restarted when
 * the engine ends on its own (iOS Safari stops at every pause regardless of
 * `continuous`), and only stops for good when tapped again or on a fatal error.
 */
export function DictationButton({
  targetId,
  fieldLabel,
  className,
}: {
  targetId: string
  fieldLabel?: string
  className?: string
}) {
  const availability = useSyncExternalStore(
    subscribeToAvailability,
    getClientAvailability,
    getServerAvailability
  )
  const [runtimeStatus, setStatus] = useState<Status>("idle")
  const [runtimeMessage, setMessage] = useState<string | null>(null)
  const [interim, setInterim] = useState("")

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const stoppedByUserRef = useRef(false)
  const restartsRef = useRef(0)

  // Environment verdict outranks runtime state: an http page or a browser with
  // no Web Speech API can never reach "listening", whatever the button did before.
  const envBlocked = availability !== null && !availability.available
  const status: Status =
    availability === null ? "checking" : envBlocked ? "blocked" : runtimeStatus
  const message =
    envBlocked && !availability.available ? availability.message : runtimeMessage

  const target = useCallback((): DictationTarget | null => {
    const el = document.getElementById(targetId)
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el
    return null
  }, [targetId])

  const teardown = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.onstart = null
    try {
      recognition.abort()
    } catch {
      // Already stopped — nothing to unwind.
    }
  }, [])

  // Never leave the mic open behind a navigation.
  useEffect(() => teardown, [teardown])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setStatus("blocked")
      setMessage("This browser has no Web Speech API.")
      return
    }
    const el = target()
    if (!el) {
      setStatus("error")
      setMessage("Could not find the field to dictate into.")
      return
    }

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = navigator.language || "en-US"

    recognition.onresult = (event) => {
      let pending = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ""
        if (result.isFinal) {
          // Committing per final keeps long rambles safe: nothing is held in
          // memory waiting for a stop that a dropped connection might prevent.
          const field = target()
          if (field) insertAtCursor(field, transcript)
          restartsRef.current = 0
        } else {
          pending += transcript
        }
      }
      setInterim(pending)
    }

    recognition.onerror = (event) => {
      const code = event.error
      // no-speech fires constantly during pauses; aborted is our own stop().
      if (code === "no-speech" || code === "aborted") return
      setInterim("")
      if (isFatalSpeechError(code)) {
        stoppedByUserRef.current = true
        setStatus("blocked")
        setMessage(describeSpeechError(code))
      } else {
        setStatus("error")
        setMessage(describeSpeechError(code))
      }
    }

    recognition.onend = () => {
      setInterim("")
      if (stoppedByUserRef.current) {
        recognitionRef.current = null
        setStatus((s) => (s === "listening" ? "idle" : s))
        return
      }
      // The engine ended on its own. Restart so a pause doesn't end the session,
      // with a ceiling so a silently-failing engine can't spin forever.
      restartsRef.current += 1
      if (restartsRef.current > 50) {
        recognitionRef.current = null
        setStatus("error")
        setMessage("Dictation kept dropping out. Tap to start again.")
        return
      }
      try {
        recognition.start()
      } catch {
        // iOS can refuse a restart outside a user gesture.
        recognitionRef.current = null
        setStatus("idle")
        setMessage("Dictation paused. Tap to resume.")
      }
    }

    stoppedByUserRef.current = false
    restartsRef.current = 0
    recognitionRef.current = recognition

    try {
      recognition.start()
      setStatus("listening")
      setMessage(null)
      el.focus({ preventScroll: true })
    } catch {
      recognitionRef.current = null
      setStatus("error")
      setMessage("Could not start dictation. Tap to try again.")
    }
  }, [target])

  const stop = useCallback(() => {
    stoppedByUserRef.current = true
    setInterim("")
    setStatus("idle")
    const recognition = recognitionRef.current
    if (!recognition) return
    try {
      recognition.stop()
    } catch {
      teardown()
    }
  }, [teardown])

  const listening = status === "listening"
  const faulted = status === "blocked" || status === "error"
  const disabled = status === "checking" || status === "blocked"

  const accent = faulted
    ? "var(--red)"
    : listening
      ? "var(--phosphor)"
      : "var(--amber-dim)"

  const label = listening
    ? "Listening"
    : status === "checking"
      ? "···"
      : status === "blocked"
        ? "Unavailable"
        : status === "error"
          ? "Retry"
          : "Dictate"

  const ariaLabel = fieldLabel
    ? `${listening ? "Stop dictating into" : "Dictate into"} ${fieldLabel}`
    : listening
      ? "Stop dictation"
      : "Start dictation"

  return (
    <div className={`flex flex-col items-end gap-1 ${className ?? ""}`}>
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={ariaLabel}
        title={message ?? undefined}
        className="relative flex items-center gap-2 border px-2 py-[5px] text-[9px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          color: accent,
          borderColor: faulted
            ? "var(--red)"
            : listening
              ? "var(--phosphor)"
              : "var(--line-dim)",
          background: listening ? "var(--phosphor-dim)" : "transparent",
          boxShadow: listening ? "0 0 8px rgba(58,189,111,0.22)" : "none",
        }}
      >
        <CornerMarks />
        {listening ? <PulsingDot /> : <MicGlyph muted={faulted} />}
        <span>{label}</span>
      </button>

      {/* Live interim transcript — never written to the field until it's final. */}
      {listening && interim ? (
        <p className="max-w-[280px] text-right text-[9px] leading-relaxed tracking-[0.04em] text-amber-dim">
          {interim}
        </p>
      ) : null}

      {/* One live region for both fault copy and the listening cue. */}
      <p
        role="status"
        aria-live="polite"
        className="max-w-[280px] text-right text-[9px] leading-relaxed tracking-[0.04em]"
        style={{ color: faulted ? "var(--red)" : "var(--amber-dim)" }}
      >
        {message ?? (listening ? "Listening — tap again to stop." : "")}
      </p>
    </div>
  )
}

/** 5px phosphor dot, pulsing while the mic is open. */
function PulsingDot() {
  return (
    <span
      className="inline-block h-[5px] w-[5px] shrink-0 animate-pulse rounded-full"
      style={{
        background: "var(--phosphor)",
        boxShadow: "0 0 6px var(--phosphor)",
      }}
      aria-hidden
    />
  )
}

/** Schematic mic: capsule, arc, stand. Line art, no fill. */
function MicGlyph({ muted }: { muted?: boolean }) {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden>
      <rect
        x="3"
        y="0.5"
        width="3"
        height="5.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <path
        d="M1 5.2a3.5 3.5 0 0 0 7 0"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
      />
      <line x1="4.5" y1="8.7" x2="4.5" y2="10.5" stroke="currentColor" strokeWidth="0.8" />
      {muted ? (
        <line x1="0.5" y1="10.5" x2="8.5" y2="0.5" stroke="currentColor" strokeWidth="0.8" />
      ) : null}
    </svg>
  )
}
