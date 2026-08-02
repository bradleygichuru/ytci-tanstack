import { auth } from '../src/lib/auth'
import { db } from '../src/db'
import { users } from '../src/db/schema/auth'
import { userProfiles } from '../src/db/schema/admin'
import { eq, sql } from 'drizzle-orm'

async function dbQuery<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}

type UserRole = 'super_admin' | 'administrator' | 'moderator' | 'county_officer' | 'user'

interface SeedUser {
  email: string
  password: string
  name: string
  role: UserRole
  profile?: {
    displayName?: string
    ageRange?: string
    county?: string
    languages?: string
  }
  ban?: {
    reason: string
    expiresInterval: string
  }
}

const seedUsers: SeedUser[] = [
  { email: 'grace@example.com', password: 'password', name: 'Grace Akinyi', role: 'administrator', profile: { displayName: 'Grace Akinyi', county: 'Mombasa', ageRange: '25-34', languages: 'English, Swahili' } },
  { email: 'moderator@example.com', password: 'password', name: 'Moderator User', role: 'moderator' },
  { email: 'officer@example.com', password: 'password', name: 'James Ouma', role: 'county_officer', profile: { displayName: 'James Ouma', county: 'Narok', ageRange: '35-44', languages: 'English, Swahili, Maa' } },
  { email: 'suspended@example.com', password: 'password', name: 'Suspended User', role: 'moderator', ban: { reason: 'Test suspension', expiresInterval: "1 year" } },
  { email: 'alice@example.com', password: 'password', name: 'Alice Njeri', role: 'user', profile: { displayName: 'Alice Njeri', county: 'Kiambu', ageRange: '18-24', languages: 'English, Swahili' } },
  { email: 'bob@example.com', password: 'password', name: 'Bob Otieno', role: 'user', profile: { displayName: 'Bob Otieno', county: 'Kisumu', ageRange: '25-34', languages: 'English, Swahili, Luo' } },
  { email: 'carol@example.com', password: 'password', name: 'Carol Wanjiku', role: 'county_officer', profile: { displayName: 'Carol Wanjiku', county: 'Kwale', ageRange: '25-34', languages: 'English, Swahili' } },
  { email: 'dave@example.com', password: 'password', name: 'David Kipchoge', role: 'moderator', profile: { displayName: 'David Kipchoge', county: 'Nandi', ageRange: '35-44', languages: 'English, Swahili, Kalenjin' } },
  { email: 'eve@example.com', password: 'password', name: 'Eve Muthoni', role: 'user' },
  { email: 'frank@example.com', password: 'password', name: 'Frank Barasa', role: 'user', profile: { displayName: 'Frank Barasa', county: 'Bungoma', ageRange: '25-34', languages: 'English, Swahili, Bukusu' } },
  { email: 'banned@example.com', password: 'password', name: 'Banned User', role: 'user', ban: { reason: 'Test ban — spam account', expiresInterval: "6 months" } },
]

async function main() {
  console.log('Seeding test users via better-auth...')

  for (const u of seedUsers) {
    try {
      const r = await dbQuery(() => db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1))
      if (r.length > 0) {
        console.log(`SKIP ${u.email} — already exists`)
        continue
      }

      const result = await dbQuery(() => auth.api.signUpEmail({
        body: { email: u.email, password: u.password, name: u.name },
      })) as unknown as { user: { id: string; email: string } }

      console.log(`CREATED ${u.email} (${u.role})`)

      await dbQuery(() => db.update(users).set({ role: u.role }).where(eq(users.id, result.user.id)))

      const profile = u.profile
      if (profile) {
        await dbQuery(() => db.insert(userProfiles).values({
          userId: result.user.id,
          displayName: profile.displayName ?? u.name,
          ageRange: profile.ageRange ?? null,
          county: profile.county ?? null,
          languages: profile.languages ?? null,
          createdBy: result.user.id,
        }).onConflictDoNothing())
        console.log(`  PROFILE ${u.email}`)
      }
    } catch (err) {
      console.error(`FAIL ${u.email}`, (err as Error).message)
    }
  }

  for (const u of seedUsers.filter(u => u.ban)) {
    try {
      const r = await dbQuery(() => db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1))
      if (r.length === 0) continue
      await dbQuery(() => db.update(users).set({
        banned: true,
        banReason: u.ban!.reason,
        banExpires: sql`NOW() + ${u.ban!.expiresInterval.replace(/\s/g, '')}::interval`,
      }).where(eq(users.id, r[0].id)))
      console.log(`BANNED ${u.email}`)
    } catch (err) {
      console.error(`FAIL banning ${u.email}`, (err as Error).message)
    }
  }

  console.log('Done!')
}

main()
