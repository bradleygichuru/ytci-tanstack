import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "#/lib/auth"

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) return { user: null, token: null }

  const cookieHeader = headers['cookie'] ?? headers['Cookie'] ?? ''
  const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : String(cookieHeader)
  const match = cookieStr.match(/better-auth\.session_token=([^;]+)/)
  const token = match ? decodeURIComponent(match[1]) : null

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
