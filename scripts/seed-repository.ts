import { sql } from 'drizzle-orm'
import { db } from '../src/db'
import { repositoryCategories, repositorySettings } from '../src/db/schema/repository'

// Fixed repository taxonomy. Entries store the display `name` in
// repository_entries.category; this table keeps the admin dropdowns and
// server-side validation aligned. Counties are never seeded here — they come
// from kenya_counties (47 rows loaded via PostGIS).
const CATEGORIES = {
  competition_entry: [
    'Photography',
    'Video',
    'Storytelling',
    'Digital Campaign',
    'Innovation Pitch',
    'Other',
  ],
  innovation: [
    'Tourism Tech',
    'Sustainable Travel',
    'Community Impact',
    'Creative Enterprise',
    'Other',
  ],
  conservation_resource: [
    'Sustainable Tourism',
    'Digital Tourism',
    'Youth Investment',
    'Conservation Practice',
    'County Guide',
    'Other',
  ],
  experience: ['National Parks', 'Coast', 'Culture & Heritage', 'Urban', 'Adventure', 'Other'],
} as const

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function seedCategories() {
  const rows = Object.entries(CATEGORIES).flatMap(([kind, names]) =>
    names.map((name, index) => ({
      kind: kind as keyof typeof CATEGORIES,
      name,
      slug: slugify(name),
      sortOrder: index,
    })),
  )

  await db
    .insert(repositoryCategories)
    .values(rows)
    .onConflictDoUpdate({
      target: [repositoryCategories.kind, repositoryCategories.slug],
      set: {
        name: sql`excluded.name`,
        sortOrder: sql`excluded.sort_order`,
      },
    })

  console.log(`repository categories upserted: ${rows.length}`)
}

async function seedSettings() {
  await db
    .insert(repositorySettings)
    .values({
      id: 'default',
      submissionsOpen: false,
      submissionIntro:
        'Competition entries and youth innovation projects are open for submission. Guides and travel experiences are curated by the YTCI team.',
      termsVersion: '2026-11',
    })
    .onConflictDoUpdate({
      target: repositorySettings.id,
      set: {
        submissionIntro: sql`excluded.submission_intro`,
        termsVersion: sql`excluded.terms_version`,
        updatedAt: new Date(),
      },
    })

  console.log('repository settings singleton upserted')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is not set')
    process.exit(2)
  }
  await seedCategories()
  await seedSettings()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAIL:', err)
    process.exit(1)
  })
