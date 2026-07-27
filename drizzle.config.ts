import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: ['./src/db/schema/auth.ts', './src/db/schema/admin.ts', './src/db/schema/business.ts'],
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
