import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { SWRegister } from "@/components/sw-register"

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "ЛАЙКА — Transmission Log",
  description:
    "A schematic journaling instrument. Freeform transmissions, weekly reflection cycles, Obsidian export.",
  manifest: "/manifest.webmanifest",
  applicationName: "Laika",
  appleWebApp: {
    capable: true,
    title: "Laika",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/laika-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/laika-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/laika-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  // theme-color follows the active theme — void black for dark, white for light.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  colorScheme: "dark light",
}

/**
 * Sync-blocking inline script that reads the saved theme preference and toggles
 * the `dark` class on <html> before paint. Prevents a flash of dark-mode content
 * for users who saved 'light'. Must run in <head> before any body content paints.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('laika-theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark')}else{d.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-void text-line flex flex-col">
        {children}
        <SWRegister />
      </body>
    </html>
  )
}
