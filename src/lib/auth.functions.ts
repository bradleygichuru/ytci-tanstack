import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "#/lib/auth"

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) return { user: null, token: null }

  let token: string | null = null
  try {
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/auth/token`, { headers })
    if (res.ok) {
      const body = await res.json() as { token?: string }
      token = body.token ?? null
    }
  } catch { /* token fetch best-effort */ }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: (session.user as Record<string, unknown>).role as string ?? 'moderator',
    },
    token,
  }
})

export const ensureSession = createServerFn({ method: "GET" }).handler(async () => {
  const result = await getSession()
  if (!result.user) throw new Error("Unauthorized")
  return result
})
