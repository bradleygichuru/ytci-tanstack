import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { randomUUID } from "node:crypto"
import { auth } from "#/lib/auth"
import { db } from "#/db"
import { userProfiles, auditLogs } from "#/db/schema/admin"
import { users } from "#/db/schema/auth"
import { requirePermission } from "#/lib/authz"
import type { AuthSession } from "#/lib/authz"
import { eq, desc, sql } from "drizzle-orm"

const LIST_USERS_DEFAULT_LIMIT = 50
const LIST_USERS_MAX_LIMIT = 100

export type UserRole = 'super_admin' | 'administrator' | 'moderator' | 'county_officer'

export interface UserItem {
  id: string
  email: string
  name: string
  role: string
  banned: boolean
  banReason: string | null
  banExpires: string | null
  emailVerified: boolean
  ageRange: string | null
  county: string | null
  languages: string | null
  preferences: string | null
  consentGrantedAt: string | null
  createdAt: string
  createdBy: string | null
}

export interface AuditItem {
  id: string
  userId: string
  userName: string
  action: string
  details: string | null
  performedBy: string
  performedByName: string
  createdAt: string
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
}

type SessionLike = { user: { id: string; role?: string | null } }

function toAuthSession(s: SessionLike | null): AuthSession | null {
  if (!s?.user) return null
  return { user: { role: s.user.role ?? '' } }
}

async function requireUsersRead(headers: Record<string, string>): Promise<SessionLike> {
  const session = await auth.api.getSession({ headers }) as SessionLike | null
  requirePermission(toAuthSession(session), 'users', ['read'])
  return session!
}

function toUserItem(user: Record<string, unknown>, profile?: { ageRange: string | null; county: string | null; languages: string | null; preferences: string | null; consentGrantedAt: Date | null; createdBy: string | null }): UserItem {
  return {
    id: user.id as string,
    email: user.email as string,
    name: user.name as string,
    role: (user.role as string) ?? 'moderator',
    banned: (user.banned as boolean) ?? false,
    banReason: (user.banReason as string | null) ?? null,
    banExpires: (user.banExpires as string | null) ?? null,
    emailVerified: (user.emailVerified as boolean) ?? false,
    ageRange: profile?.ageRange ?? null,
    county: profile?.county ?? null,
    languages: profile?.languages ?? null,
    preferences: profile?.preferences ?? null,
    consentGrantedAt: profile?.consentGrantedAt?.toISOString() ?? null,
    createdAt: (user.createdAt as string) ?? new Date().toISOString(),
    createdBy: profile?.createdBy ?? null,
  }
}

async function enrichUser(user: Record<string, unknown>): Promise<UserItem> {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id as string)).limit(1)
  return toUserItem(user, profile ?? undefined)
}

function reqHeaders(): Record<string, string> {
  return getRequestHeaders() as unknown as Record<string, string>
}

export const listUsers = createServerFn({ method: "GET" })
  .validator((d: { limit?: number; offset?: number; sortBy?: string; sortDirection?: string; searchValue?: string; searchField?: string; filterField?: string; filterValue?: string; filterOperator?: string }) => d)
  .handler(async ({ data }) => {
    const headers = reqHeaders()
    await requireUsersRead(headers)
    const limit = Math.min(data.limit ?? LIST_USERS_DEFAULT_LIMIT, LIST_USERS_MAX_LIMIT)
    const offset = data.offset ?? 0
    const query: Record<string, unknown> = { limit, offset }
    if (data.sortBy) query.sortBy = data.sortBy
    if (data.sortDirection) query.sortDirection = data.sortDirection
    if (data.searchValue) query.searchValue = data.searchValue
    if (data.searchField) query.searchField = data.searchField
    if (data.filterField) query.filterField = data.filterField
    if (data.filterValue) query.filterValue = data.filterValue
    if (data.filterOperator) query.filterOperator = data.filterOperator
    const result = await auth.api.listUsers({ query, headers }) as unknown as { users: Record<string, unknown>[]; total: number }
    const enriched = await Promise.all(result.users.map(enrichUser))
    return { users: enriched, total: result.total ?? result.users.length, limit, offset }
  })

export const getUser = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const headers = reqHeaders()
    await requireUsersRead(headers)
    const result = await auth.api.getUser({ query: { id: data.userId }, headers }) as unknown as { user: Record<string, unknown> }
    if (!result?.user) throw new Error('Not found')
    return enrichUser(result.user)
  })

export const createUser = createServerFn({ method: "POST" })
  .validator((d: { name: string; email: string; role: string; ageRange?: string; county?: string; languages?: string; preferences?: string }) => d)
  .handler(async ({ data }) => {
    const headers = reqHeaders()
    const session = await requireUsersRead(headers)
    requirePermission(toAuthSession(session), 'users', ['create'])
    const performedBy = session.user.id
    const password = randomUUID().replace(/-/g, '').slice(0, 12)
    const result = await auth.api.createUser({ body: { email: data.email, password, name: data.name, role: data.role as never }, headers }) as unknown as { user: { id: string } }
    const userId = result.user.id
    await db.insert(userProfiles).values({
      userId,
      ageRange: data.ageRange ?? null,
      county: data.county ?? null,
      languages: data.languages ?? null,
      preferences: data.preferences ?? null,
      createdBy: performedBy,
    })
    await writeAudit(userId, 'user_created', `User created by admin. Email: ${data.email}, Role: ${data.role}`, performedBy)
    const user: Record<string, unknown> = { id: userId, name: data.name, email: data.email, role: data.role, banned: false, banReason: null, banExpires: null, emailVerified: false, createdAt: new Date().toISOString() }
    return { user: toUserItem(user, { ageRange: data.ageRange ?? null, county: data.county ?? null, languages: data.languages ?? null, preferences: data.preferences ?? null, consentGrantedAt: null, createdBy: performedBy }), tempPassword: password }
  })

export const updateUser = createServerFn({ method: "POST" })
  .validator((d: { userId: string; name?: string; role?: string; banned?: boolean; banReason?: string; ageRange?: string; county?: string; languages?: string; preferences?: string; consentGrantedAt?: string | null }) => d)
  .handler(async ({ data }) => {
    const headers = reqHeaders()
    const session = await requireUsersRead(headers)
    const performedBy = session.user.id
    const sess = toAuthSession(session)
    if (data.role !== undefined) {
      requirePermission(sess, 'users', ['assign-role'])
      await auth.api.setRole({ body: { userId: data.userId, role: data.role as never }, headers })
      await writeAudit(data.userId, 'role_assigned', `Role changed to ${data.role}`, performedBy)
    }
    if (data.banned !== undefined) {
      requirePermission(sess, 'users', ['suspend-user'])
      if (data.banned) {
        await auth.api.banUser({ body: { userId: data.userId, banReason: data.banReason ?? '' as never }, headers })
        await writeAudit(data.userId, 'account_suspended', `Account suspended. Reason: ${data.banReason ?? 'Not provided'}`, performedBy)
      } else {
        await auth.api.unbanUser({ body: { userId: data.userId }, headers })
        await writeAudit(data.userId, 'account_unsuspended', 'Account unsuspended', performedBy)
      }
    }
    if (data.name !== undefined) {
      await auth.api.adminUpdateUser({ body: { userId: data.userId, data: { name: data.name } }, headers })
    }
    const profileUpdate: Record<string, unknown> = {}
    if (data.ageRange !== undefined) profileUpdate.ageRange = data.ageRange
    if (data.county !== undefined) profileUpdate.county = data.county
    if (data.languages !== undefined) profileUpdate.languages = data.languages
    if (data.preferences !== undefined) profileUpdate.preferences = data.preferences
    if (data.consentGrantedAt !== undefined) {
      profileUpdate.consentGrantedAt = data.consentGrantedAt ? new Date(data.consentGrantedAt) : null
      if (data.consentGrantedAt) {
        await writeAudit(data.userId, 'consent_granted', 'Consent granted', performedBy)
      } else {
        await writeAudit(data.userId, 'consent_revoked', 'Consent revoked', performedBy)
      }
    }
    if (Object.keys(profileUpdate).length > 0) {
      const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, data.userId)).limit(1)
      if (existing.length > 0) {
        await db.update(userProfiles).set(profileUpdate).where(eq(userProfiles.userId, data.userId))
      } else {
        await db.insert(userProfiles).values({ userId: data.userId, createdBy: performedBy, ...profileUpdate })
      }
    }
    return getUser({ data: { userId: data.userId } })
  })

export const listAuditLog = createServerFn({ method: "GET" })
  .validator((d: { limit?: number; offset?: number }) => d)
  .handler(async ({ data }) => {
    const headers = reqHeaders()
    await requireUsersRead(headers)
    const limit = data.limit ?? 50
    const offset = data.offset ?? 0
    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        action: auditLogs.action,
        details: auditLogs.details,
        performedBy: auditLogs.performedBy,
        performedByName: sql<string>`(SELECT name FROM "users" WHERE id = ${auditLogs.performedBy})`,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs)
    return { items: rows as unknown as AuditItem[], total: Number(count), limit, offset }
  })

async function writeAudit(userId: string, action: string, details: string | null, performedBy: string) {
  await db.insert(auditLogs).values({ id: generateId(), userId, action, details, performedBy })
}
