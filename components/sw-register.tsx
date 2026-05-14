"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js on mount. Only runs in production builds — registering during
 * `next dev` produces stale-cache headaches that get in the way of HMR.
 */
export function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Surface to the console; never block rendering.
          console.warn("SW registration failed:", err)
        })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
