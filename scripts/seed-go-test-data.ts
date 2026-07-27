import { db } from '../src/db'
import { destinations, events, campaigns, courses, conservationActivities, challenges } from '../src/db/schema/business'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('FATAL: DATABASE_URL is not set'); process.exit(2) }

async function main() {
  console.log('Seeding Go business tables with test data...')

  // Destinations
  const existingDests = await db.select({ id: destinations.id }).from(destinations).limit(1)
  if (existingDests.length === 0) {
    await db.insert(destinations).values([
      { name: 'Maasai Mara', slug: 'maasai-mara', county: 'Narok', category: 'wildlife', status: 'published' },
      { name: 'Diani Beach', slug: 'diani-beach', county: 'Kwale', category: 'beach', status: 'published' },
      { name: 'Mount Kenya', slug: 'mount-kenya', county: 'Meru', category: 'adventure', status: 'draft' },
    ])
    console.log('Created 3 test destinations')
  } else {
    console.log('Destinations already seeded, skipping')
  }

  // Events
  const existingEvents = await db.select({ id: events.id }).from(events).limit(1)
  if (existingEvents.length === 0) {
    await db.insert(events).values([
      { title: 'Cultural Festival', organizer: 'Narok County', county: 'Narok', type: 'cultural', status: 'scheduled' },
      { title: 'Nairobi Marathon', organizer: 'Athletics Kenya', county: 'Nairobi', type: 'sports', status: 'scheduled' },
      { title: 'Tree Planting Drive', organizer: 'Green Africa', county: 'Nyeri', type: 'conservation', status: 'postponed' },
    ])
    console.log('Created 3 test events')
  } else {
    console.log('Events already seeded, skipping')
  }

  // Campaigns
  const existingCampaigns = await db.select({ id: campaigns.id }).from(campaigns).limit(1)
  if (existingCampaigns.length === 0) {
    await db.insert(campaigns).values([
      { title: 'Summer Safari Promo', type: 'home_banner', status: 'active' },
      { title: 'Beach Weekend', type: 'featured_destination', status: 'draft' },
    ])
    console.log('Created 2 test campaigns')
  } else {
    console.log('Campaigns already seeded, skipping')
  }

  // Courses
  const existingCourses = await db.select({ id: courses.id }).from(courses).limit(1)
  if (existingCourses.length === 0) {
    await db.insert(courses).values([
      { title: 'Wildlife Conservation 101', description: 'Intro to Kenyan wildlife conservation', difficulty: 'beginner', status: 'published' },
      { title: 'Advanced Eco-Tourism', description: 'Sustainable tourism practices', difficulty: 'advanced', status: 'draft' },
    ])
    console.log('Created 2 test courses')
  } else {
    console.log('Courses already seeded, skipping')
  }

  // Conservation Activities
  const existingConservation = await db.select({ id: conservationActivities.id }).from(conservationActivities).limit(1)
  if (existingConservation.length === 0) {
    await db.insert(conservationActivities).values([
      { title: 'Mara River Cleanup', organizer: 'WWF Kenya', impactMetric: 'kg waste collected', status: 'active' },
      { title: 'Tree Planting in Karura', organizer: 'Karura Forest Trust', impactMetric: 'trees planted', status: 'active' },
    ])
    console.log('Created 2 test conservation activities')
  } else {
    console.log('Conservation activities already seeded, skipping')
  }

  // Challenges
  const existingChallenges = await db.select({ id: challenges.id }).from(challenges).limit(1)
  if (existingChallenges.length === 0) {
    await db.insert(challenges).values([
      { title: '30-Day Bird Watching Challenge', badgeName: 'Bird Watcher', status: 'active' },
      { title: 'Zero Waste Week', badgeName: 'Eco Warrior', status: 'draft' },
    ])
    console.log('Created 2 test challenges')
  } else {
    console.log('Challenges already seeded, skipping')
  }

  console.log('Done!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
