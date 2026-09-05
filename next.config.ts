import type { NextConfig } from "next"

// Signed photo URLs come from Rio, so the image pattern has to match Rio's
// actual origin — scheme, host and port. All three are derived from the env var
// rather than hardcoded: Rio moved from plain http on a LAN IP to Tailscale TLS
// on :9443, and a hardcoded protocol silently broke photo rendering last time.
const supabaseUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  } catch {
    return undefined
  }
})()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseUrl.hostname,
            // Omitting `port` would match any port; being explicit keeps the
            // pattern as narrow as the origin the app was actually built against.
            ...(supabaseUrl.port ? { port: supabaseUrl.port } : {}),
            pathname: "/storage/v1/object/sign/**",
          },
        ]
      : [],
  },
}

export default nextConfig
