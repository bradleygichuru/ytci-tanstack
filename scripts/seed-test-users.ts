import { auth } from '../src/lib/auth'
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('FATAL: DATABASE_URL is not set'); process.exit(2) }

const pool = new Pool({ connectionString: DATABASE_URL })

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

const users: SeedUser[] = [
  // Existing users (will be skipped if already present)
  { email: 'admin@example.com', password: 'password', name: 'Admin User', role: 'super_admin', profile: { displayName: 'Admin User', county: 'Nairobi', ageRange: '35-44', languages: 'English, Swahili' } },
  { email: 'grace@example.com', password: 'password', name: 'Grace Akinyi', role: 'administrator', profile: { displayName: 'Grace Akinyi', county: 'Mombasa', ageRange: '25-34', languages: 'English, Swahili' } },
  { email: 'moderator@example.com', password: 'password', name: 'Moderator User', role: 'moderator' },
  { email: 'officer@example.com', password: 'password', name: 'James Ouma', role: 'county_officer', profile: { displayName: 'James Ouma', county: 'Narok', ageRange: '35-44', languages: 'English, Swahili, Maa' } },
  { email: 'suspended@example.com', password: 'password', name: 'Suspended User', role: 'moderator', ban: { reason: 'Test suspension — violating community guidelines', expiresInterval: "1 year" } },
  // New users
  { email: 'alice@example.com', password: 'password', name: 'Alice Njeri', role: 'user', profile: { displayName: 'Alice Njeri', county: 'Kiambu', ageRange: '18-24', languages: 'English, Swahili' } },
  { email: 'bob@example.com', password: 'password', name: 'Bob Otieno', role: 'user', profile: { displayName: 'Bob Otieno', county: 'Kisumu', ageRange: '25-34', languages: 'English, Swahili, Luo' } },
  { email: 'carol@example.com', password: 'password', name: 'Carol Wanjiku', role: 'county_officer', profile: { displayName: 'Carol Wanjiku', county: 'Kwale', ageRange: '25-34', languages: 'English, Swahili' } },
  { email: 'dave@example.com', password: 'password', name: 'David Kipchoge', role: 'moderator', profile: { displayName: 'David Kipchoge', county: 'Nandi', ageRange: '35-44', languages: 'English, Swahili, Kalenjin' } },
  { email: 'eve@example.com', password: 'password', name: 'Eve Muthoni', role: 'user' },
  { email: 'frank@example.com', password: 'password', name: 'Frank Barasa', role: 'user', profile: { displayName: 'Frank Barasa', county: 'Bungoma', ageRange: '25-34', languages: 'English, Swahili, Bukusu' } },
  { email: 'banned@example.com', password: 'password', name: 'Banned User', role: 'user', ban: { reason: 'Test ban — spam account', expiresInterval: "6 months" } },
]

async function main() {
  console.log('Seeding test users...')

  for (const u of users) {
    try {
      const existing = await pool.query(`SELECT id FROM "users" WHERE email = $1`, [u.email])
      if (existing.rows.length > 0) {
        console.log(`SKIP ${u.email} — already exists`)
        continue
      }
      const result = await auth.api.signUpEmail({
        body: { email: u.email, password: u.password, name: u.name },
      }) as unknown as { user: { id: string; email: string } }

      await pool.query(`UPDATE "users" SET role = $1 WHERE id = $2`, [u.role, result.user.id])
      console.log(`CREATED ${u.email} (${u.role})`)

      // Create profile if provided
      if (u.profile) {
        await pool.query(
          `INSERT INTO "user_profiles" ("user_id", "display_name", "age_range", "county", "languages", "created_by", "created_at", "updated_at")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT ("user_id") DO NOTHING`,
          [
            result.user.id,
            u.profile.displayName ?? u.name,
            u.profile.ageRange ?? null,
            u.profile.county ?? null,
            u.profile.languages ?? null,
            result.user.id,
          ],
        )
        console.log(`  PROFILE ${u.email}`)
      }
    } catch (err) {
      console.error(`FAIL ${u.email}`, err)
    }
  }

  // Apply bans
  for (const u of users.filter((u) => u.ban)) {
    try {
      await pool.query(
        `UPDATE "users"
         SET banned = true, "ban_reason" = $1, "ban_expires" = NOW() + $2::interval
         WHERE email = $3 AND banned = false`,
        [u.ban!.reason, u.ban!.expiresInterval, u.email],
      )
      console.log(`BANNED ${u.email}`)
    } catch (err) {
      console.error(`FAIL banning ${u.email}`, err)
    }
  }

  await pool.end()
  console.log('Done!')
}

main()
