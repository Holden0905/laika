import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/session"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Match every path except: _next assets, image optimizer, favicon, public images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
