/**
 * Disposable seed for ticket #372 (species verification). Not product code.
 * Creates the four contract roles the species surface gates on.
 */
import { auth } from '../src/lib/auth'
import { db } from '../src/db'
import { users } from '../src/db/schema/auth'
import { eq } from 'drizzle-orm'

const people = [
  { email: 'verify-admin@example.test', name: 'Verify Admin', role: 'super_admin' },
  { email: 'verify-editor@example.test', name: 'Verify Editor', role: 'content_editor' },
  { email: 'verify-translator@example.test', name: 'Verify Translator', role: 'translator' },
  { email: 'verify-reviewer@example.test', name: 'Verify Reviewer', role: 'language_reviewer' },
] as const

for (const person of people) {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, person.email)).limit(1)
  if (existing[0]) {
    await db.update(users).set({ role: person.role }).where(eq(users.id, existing[0].id))
    console.log('updated', person.email, person.role)
    continue
  }
  const result = (await auth.api.signUpEmail({
    body: { email: person.email, password: 'password', name: person.name },
  })) as unknown as { user: { id: string } }
  await db.update(users).set({ role: person.role }).where(eq(users.id, result.user.id))
  console.log('created', person.email, person.role)
}
process.exit(0)
