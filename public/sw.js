/**
 * Laika service worker — basic offline shell.
 *
 * Strategy:
 *   - Navigations (HTML): network-first, fall back to /offline if offline.
 *   - Same-origin static assets (/_next/static, /icons, /bleed, manifest): cache-first,
 *     populated lazily on first successful fetch.
 *   - Everything else (cross-origin, API requests, Supabase): pass through to network.
 *
 * Bump CACHE on changes to PRECACHE_URLS or strategy so old clients pick up the new SW.
 */

const CACHE = "laika-shell-v1"
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/laika-icon-192.png",
  "/icons/laika-icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

function shouldCacheAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/bleed/") ||
    pathname === "/manifest.webmanifest"
  )
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigation requests: network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/offline")
        return cached ?? new Response("Offline", { status: 503 })
      })
    )
    return
  }

  // Static assets: cache-first, populate on first network success.
  if (shouldCacheAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Everything else (Supabase API, route handlers, etc.) — let the browser do its thing.
})
