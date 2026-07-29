import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "#/lib/auth"
import { db } from "#/lib/auth"
import { eq } from "drizzle-orm"
import { userProfiles } from "#/db/schema/admin"
import { z } from "zod"

const profileSchema = z.object({
  displayName: z.string().optional(),
  ageRange: z.string().optional(),
  county: z.string().optional(),
  languages: z.string().optional(),
  preferences: z.string().optional(),
})

export const getOwnProfile = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error("Unauthorized")

  const userId = session.user.id
  const [row] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)

  return row ?? null
})

export const upsertOwnProfile = createServerFn({ method: "POST" })
  .validator(profileSchema)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) throw new Error("Unauthorized")

    const userId = session.user.id
    const existing = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    const update: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      update[key] = value === "" ? null : value
    }

    if (existing.length > 0) {
      const [row] = await db
        .update(userProfiles)
        .set(update)
        .where(eq(userProfiles.userId, userId))
        .returning()
      return row
    }

    const [row] = await db
      .insert(userProfiles)
      .values({
        userId,
        createdBy: userId,
        ...update,
      })
      .returning()
    return row
  })
