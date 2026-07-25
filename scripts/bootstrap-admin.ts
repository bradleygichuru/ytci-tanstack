import { auth } from '../src/lib/auth'
import { Pool } from 'pg'
import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline'
import { stdout, stderr } from 'node:process'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Run with bun --env-file=.env.local')
  process.exit(2)
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question + ' ', answer => { rl.close(); resolve(answer) }))
}

function audit(action: string, detail: string) {
  const ts = new Date().toISOString()
  console.log(`BOOTSTRAP_SUPER_ADMIN ${action} ${detail} ${ts}`)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      name: { type: 'string' },
    },
  })

  const email = values.email ?? await prompt('Email:')
  const name = values.name ?? await prompt('Display name:')
  const password = values.password ?? await prompt('Password:')

  if (!email || !password || !name) {
    console.error('FATAL: email, password, and name are required')
    process.exit(2)
  }

  // Idempotency: refuse if any super_admin already exists
  const existing = await pool.query(`SELECT id, email FROM "user" WHERE role = 'super_admin' LIMIT 1`)
  if (existing.rows.length > 0) {
    audit('abort existing', existing.rows[0].email)
    console.error(`A super-admin already exists (${existing.rows[0].email}). Cannot bootstrap another.`)
    console.error('Use the User Management area to add more super-admin users.')
    process.exit(1)
  }

  // Create user via better-auth (handles password hashing, account record, etc.)
  let signUpResult: { user: { id: string; email: string } }
  try {
    signUpResult = await auth.api.signUpEmail({
      body: { email, password, name },
    }) as unknown as { user: { id: string; email: string } }
  } catch (err) {
    audit('fail signup', `${email} ${err}`)
    console.error('Failed to create user:', err)
    process.exit(2)
  }
  const userId = signUpResult.user.id

  // Override role to super_admin via direct DB update
  // (better-auth's admin plugin hook sets role to defaultRole="user" on signUp if admin plugin is active;
  //  the direct update bypasses that and sets the correct role regardless.)
  await pool.query(`UPDATE "user" SET role = 'super_admin' WHERE id = $1`, [userId])

  // Verify
  const verified = await pool.query(`SELECT role FROM "user" WHERE id = $1`, [userId])
  if (verified.rows[0]?.role !== 'super_admin') {
    audit('fail verify', userId)
    console.error('Failed to verify role update for user', userId)
    process.exit(2)
  }

  audit('ok', email)
  console.log(`Super-admin created: ${email} (user id: ${userId})`)
  console.log('Record this email in your password manager. It is the first super-admin account.')
  console.log('To add more super-admins: sign in and use the User Management area.')
  console.log('Do NOT re-run this script — it will refuse.')
}

await pool.end()
await main()
