import { auth } from "#/lib/auth"
import { db } from "#/lib/auth"
import { userProfiles, auditLogs } from "#/db/schema/admin"
import { users } from "#/db/schema/auth"
import { requirePermission } from "#/lib/authz"
import { eq, desc, asc, and, ilike, sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"

const LIST_USERS_DEFAULT_LIMIT = 50
const LIST_USERS_MAX_LIMIT = 100
const AUDIT_DEFAULT_LIMIT = 50

export interface UserItem {
  id: string; email: string; name: string; role: string
  banned: boolean; banReason: string | null; banExpires: string | null
  emailVerified: boolean
  ageRange: string | null; county: string | null; languages: string | null; preferences: string | null
  consentGrantedAt: string | null; onboardingCompleted: boolean
  createdAt: string; createdBy: string | null
}

export interface AuditItem {
  id: string; userId: string; userName: string
  action: string; details: string | null; performedBy: string
  performedByName: string; createdAt: string
}

type SessionLike = { user: { id: string; role?: string | null } }

async function requireSession(headers: Record<string, string>): Promise<SessionLike> {
  const session = await auth.api.getSession({ headers }) as SessionLike | null
  if (!session) throw new Error('Unauthorized')
  return session
}

function toAuthSession(s: SessionLike) {
  return { user: { role: s.user.role ?? '' } }
}

function toUserItem(user: Record<string, unknown>, profile?: Record<string, unknown> | null): UserItem {
  return {
    id: user.id as string, email: user.email as string, name: user.name as string,
    role: (user.role as string) ?? 'moderator', banned: (user.banned as boolean) ?? false,
    banReason: (user.ban_reason as string | null) ?? null, banExpires: (user.ban_expires as string | null) ?? null,
    emailVerified: (user.email_verified as boolean) ?? false,
    ageRange: (profile?.age_range as string | null) ?? null, county: (profile?.county as string | null) ?? null,
    languages: (profile?.languages as string | null) ?? null, preferences: (profile?.preferences as string | null) ?? null,
    consentGrantedAt: (profile?.consent_granted_at as Date | null)?.toISOString() ?? null,
    onboardingCompleted: profile ? ((profile.onboarding_completed as boolean) ?? true) : true,
    createdAt: (user.created_at as string) ?? new Date().toISOString(),
    createdBy: (profile?.created_by as string | null) ?? null,
  }
}

export async function handleList(headers: Record<string, string>, params: URLSearchParams) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'user', ['read'])
  const limit = Math.min(Number(params.get('limit')) || LIST_USERS_DEFAULT_LIMIT, LIST_USERS_MAX_LIMIT)
  const offset = Number(params.get('offset')) || 0

  const conditions: ReturnType<typeof eq>[] = []
  const role = params.get('role')
  const banned = params.get('banned')
  const search = params.get('search')
  const searchField = params.get('searchField')
  if (role) conditions.push(eq(users.role, role))
  if (banned === 'true') conditions.push(eq(users.banned, true))
  if (banned === 'false') conditions.push(eq(users.banned, false))
  if (search) {
    conditions.push(searchField === 'email' ? ilike(users.email, `%${search}%`) : ilike(users.name, `%${search}%`))
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const sortBy = params.get('sortBy')
  const sortColumns: Record<string, unknown> = { name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }
  const orderCol = sortBy && sortColumns[sortBy]
  const orderBy = orderCol
    ? (params.get('sortDirection') === 'desc' ? desc(orderCol as never) : asc(orderCol as never))
    : desc(users.createdAt)

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(where)
  const rows = await db.select().from(users).leftJoin(userProfiles, eq(users.id, userProfiles.userId)).where(where).orderBy(orderBy).limit(limit).offset(offset)
  const items: UserItem[] = rows.map(r => toUserItem(r.users as Record<string, unknown>, r.user_profiles as Record<string, unknown> | null))
  return { users: items, total: Number(count), limit, offset }
}

export async function handleGet(headers: Record<string, string>, userId: string) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'user', ['read'])
  const [row] = await db.select().from(users).leftJoin(userProfiles, eq(users.id, userProfiles.userId)).where(eq(users.id, userId)).limit(1)
  if (!row) throw new Error('Not found')
  return toUserItem(row.users as Record<string, unknown>, row.user_profiles as Record<string, unknown> | null)
}

export async function handleCreate(headers: Record<string, string>, body: Record<string, unknown>) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'user', ['create'])
  const performedBy = session.user.id
  const password = randomUUID().replace(/-/g, '').slice(0, 12)
  const result = await auth.api.createUser({ body: { email: body.email as string, password, name: body.name as string, role: body.role as never }, headers }) as unknown as { user: { id: string } }
  const userId = result.user.id
  const safe = (v: unknown) => (v !== undefined && v !== '' && v !== null ? String(v) : null)
  await db.insert(userProfiles).values({ userId, ageRange: safe(body.ageRange), county: safe(body.county), languages: safe(body.languages), preferences: safe(body.preferences), createdBy: performedBy })
  await db.insert(auditLogs).values({ id: `aud-${Date.now()}`, userId, action: 'user_created', details: `User created by admin. Email: ${body.email}, Role: ${body.role}`, performedBy })
  const user: Record<string, unknown> = { id: userId, name: body.name as string, email: body.email as string, role: body.role as string, banned: false, ban_reason: null, ban_expires: null, email_verified: false, created_at: new Date().toISOString() }
  return { user: toUserItem(user), tempPassword: password }
}

export async function handleUpdate(headers: Record<string, string>, userId: string, body: Record<string, unknown>) {
  const session = await requireSession(headers)
  const performedBy = session.user.id
  const sess = toAuthSession(session)
  if (body.role !== undefined) {
    requirePermission(sess, 'user', ['assign-role'])
    await auth.api.setRole({ body: { userId, role: body.role as never }, headers })
    await db.insert(auditLogs).values({ id: `aud-${Date.now()}`, userId, action: 'role_assigned', details: `Role changed to ${body.role}`, performedBy })
  }
  if (body.banned !== undefined) {
    requirePermission(sess, 'user', ['suspend-user'])
    if (body.banned) {
      await auth.api.banUser({ body: { userId, banReason: (body.banReason as string) ?? '' as never }, headers })
      await db.insert(auditLogs).values({ id: `aud-${Date.now()}`, userId, action: 'account_suspended', details: `Account suspended. Reason: ${body.banReason ?? 'Not provided'}`, performedBy })
    } else {
      await auth.api.unbanUser({ body: { userId }, headers })
      await db.insert(auditLogs).values({ id: `aud-${Date.now()}`, userId, action: 'account_unsuspended', details: 'Account unsuspended', performedBy })
    }
  }
  if (body.name !== undefined) {
    await auth.api.adminUpdateUser({ body: { userId, data: { name: body.name as string } }, headers })
  }
  const profileUpdate: Record<string, unknown> = {}
  const profileKeys = ['ageRange', 'county', 'languages', 'preferences'] as const
  for (const k of profileKeys) {
    const v = body[k] as string | undefined
    if (v !== undefined) profileUpdate[k] = v !== '' ? v : null
  }
  if (body.consentGrantedAt !== undefined) {
    profileUpdate.consentGrantedAt = body.consentGrantedAt ? new Date(body.consentGrantedAt as string) : null
    await db.insert(auditLogs).values({ id: `aud-${Date.now()}`, userId, action: body.consentGrantedAt ? 'consent_granted' : 'consent_revoked', details: body.consentGrantedAt ? 'Consent granted' : 'Consent revoked', performedBy })
  }
  if (Object.keys(profileUpdate).length > 0) {
    const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
    if (existing.length > 0) {
      await db.update(userProfiles).set(profileUpdate).where(eq(userProfiles.userId, userId))
    } else {
      await db.insert(userProfiles).values({ userId, createdBy: performedBy, ...profileUpdate })
    }
  }
  return handleGet(headers, userId)
}

export async function handleListAudit(headers: Record<string, string>, params: URLSearchParams) {
  await requireSession(headers)
  const limit = Math.min(Number(params.get('limit')) || AUDIT_DEFAULT_LIMIT, 100)
  const offset = Number(params.get('offset')) || 0
  const rows = await db.select({
    id: auditLogs.id, userId: auditLogs.userId, userName: users.name,
    action: auditLogs.action, details: auditLogs.details,
    performedBy: auditLogs.performedBy, performedByName: sql<string>`(SELECT name FROM "users" WHERE id = ${auditLogs.performedBy})`,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset)
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs)
  return { items: rows as unknown as AuditItem[], total: Number(count), limit, offset }
}
