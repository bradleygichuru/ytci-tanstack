import { auth } from '../src/lib/auth'
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('FATAL: DATABASE_URL is not set'); process.exit(2) }

const pool = new Pool({ connectionString: DATABASE_URL })

const users = [
  { email: 'admin@example.com', password: 'password', name: 'Admin User', role: 'super_admin' },
  { email: 'grace@example.com', password: 'password', name: 'Grace Akinyi', role: 'administrator' },
  { email: 'moderator@example.com', password: 'password', name: 'Moderator User', role: 'moderator' },
  { email: 'officer@example.com', password: 'password', name: 'County Officer', role: 'county_officer' },
  { email: 'suspended@example.com', password: 'password', name: 'Suspended User', role: 'moderator' },
]

async function main() {
  for (const u of users) {
    try {
      const existing = await pool.query(`SELECT id FROM "users" WHERE email = $1`, [u.email])
      if (existing.rows.length > 0) {
        console.log(`SKIP ${u.email} — already exists`)
        continue
      }
      const result = await auth.api.signUpEmail({ body: { email: u.email, password: u.password, name: u.name } }) as unknown as { user: { id: string; email: string } }
      await pool.query(`UPDATE "users" SET role = $1 WHERE id = $2`, [u.role, result.user.id])
      console.log(`CREATED ${u.email} (${u.role})`)
    } catch (err) {
      console.error(`FAIL ${u.email}`, err)
    }
  }
  // Ban the suspended user
  try {
    await pool.query(`UPDATE "users" SET banned = true, "ban_reason" = 'Test suspension', "ban_expires" = NOW() + INTERVAL '1 year' WHERE email = 'suspended@example.com'`)
    console.log('BANNED suspended@example.com')
  } catch {}
  await pool.end()
}

main()
