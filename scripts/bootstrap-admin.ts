import { auth } from '../src/lib/auth'
import { db } from '../src/db'
import { users } from '../src/db/schema/auth'
import { eq } from 'drizzle-orm'
import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline'

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
  const result = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, 'super_admin')).limit(1)
  const existing = result[0]
  if (existing) {
    audit('abort existing', existing.email!)
    console.error(`A super-admin already exists (${existing.email}). Cannot bootstrap another.`)
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
  // (better-auth's admin plugin hook sets role to defaultRole="user" on signUp;
  //  the direct update bypasses that and sets the correct role regardless.)
  await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, userId))

  // Verify
  const verified = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  const role = verified[0]?.role
  if (role !== 'super_admin') {
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

await main()
