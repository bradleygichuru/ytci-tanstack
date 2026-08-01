import { db } from '../src/db'
import { eq, sql } from 'drizzle-orm'
import { users } from '../src/db/schema/auth'
import { userProfiles } from '../src/db/schema/admin'
import {
  destinations,
  events,
  eventHighlights,
  eventAttendees,
  courses,
  lessons,
  quizzes,
  courseEnrollments,
  challenges,
  challengeProgress,
  conservationActivities,
  conservationEvidence,
  conservationParticipants,
  stories,
  storyInteractions,
  bucketListItems,
} from '../src/db/schema/business'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('FATAL: DATABASE_URL is not set'); process.exit(2) }

async function getAdminId(): Promise<string | null> {
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'admin@example.com')).limit(1)
  return admin?.id ?? null
}

async function getUserId(email: string): Promise<string | null> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  return user?.id ?? null
}

// ──────────────────────── Destinations ────────────────────────

async function seedDestinations(adminId: string) {
  const existing = await db.select({ id: destinations.id }).from(destinations).limit(1)
  if (existing.length > 0) {
    console.log('Destinations already seeded, skipping')
    return
  }

  const ST_MARAI_MARA = sql`ST_SetSRID(ST_MakePoint(35.1400, -1.4900), 4326)`
  const ST_DIANI = sql`ST_SetSRID(ST_MakePoint(39.5750, -4.3222), 4326)`

  const destinationValues = [
    {
      name: 'Maasai Mara National Reserve',
      slug: 'maasai-mara-national-reserve',
      county: 'Narok',
      locality: 'Maasai Mara',
      category: 'wildlife',
      status: 'published' as const,
      location: ST_MARAI_MARA,
      shortDescription: 'One of Africa\'s most iconic wildlife conservation areas and the northernmost section of the Greater Serengeti-Mara Ecosystem, renowned for hosting the Great Wildebeest Migration.',
      fullDescription: 'The Maasai Mara National Reserve is one of Africa\'s most iconic wildlife conservation areas and the northernmost section of the Greater Serengeti-Mara Ecosystem, which spans over 25,000 km² across Kenya and Tanzania. Renowned for hosting the Great Wildebeest Migration — internationally recognised as one of the Seven Natural Wonders of Africa — the Reserve supports exceptional wildlife density including all of the Big Five.\n\nNamed in honour of the Maasai people, the ancestral inhabitants of the area, it is managed by the Narok County Government and serves as both a premium safari destination and a living testament to Maasai conservation-compatible culture. The reserve covers 1,510 km² of open grassland savannah with acacia trees, seasonal riverlets, and forested river banks along the Mara, Talek, and Sand Rivers.',
      significance: 'UNESCO Tentative List for World Heritage Site inscription. Hosts the Great Wildebeest Migration, one of the Seven Natural Wonders of Africa. Important Bird Area (IBA) designated by BirdLife International with 500+ bird species.',
      history: 'Originally designated as a wildlife sanctuary in 1948, the Maasai Mara was established as a game reserve in 1961. The Maasai people have lived in the area for centuries and continue to practise their traditional pastoralist lifestyle alongside wildlife conservation.',
      thingsToDo: 'Game drives (guided and self-drive in some areas), Hot air balloon safaris at dawn, Guided walking safaris, Maasai cultural village visits, Bird watching (500+ species), Night game drives in select conservancies, Photography safaris, Bush breakfasts and sundowners, Horseback safaris in conservancies',
      suitableAudiences: 'Wildlife enthusiasts, Families, Photographers, Adventure seekers, Cultural tourists',
      duration: '2-5 days recommended',
      difficulty: 'moderate',
      seasonality: 'Year-round game viewing. July to October best for Great Wildebeest Migration and Mara River crossings. Driest months (June-October) offer best wildlife concentration around water sources.',
      indicativeFees: 'USD 80/day non-resident adult, USD 45/day non-resident child. Conservancy fees may apply separately.',
      openingInfo: 'Open daily, 6:00 AM to 7:00 PM. Night drives available in select conservancies with permission.',
      transportAccessRoute: '270 km from Nairobi via Narok town (5-6 hours by road). Scheduled flights from Wilson Airport to Mara airstrips (45 minutes). Charter flights available.',
      accessibility: 'Main roads are gravel and can be rough during rains. 4x4 vehicles recommended. Some lodges offer wheelchair-accessible facilities.',
      facilities: 'Rest camps, Luxury lodges, Tented camps, Visitor centre, Picnic sites, Bandas',
      safetyNotes: 'Always stay in your vehicle during game drives. Follow guide instructions. Carry sufficient water. malaria prophylaxis recommended.',
      source: 'Kenya Wildlife Service, Narok County Government',
      contentOwner: 'YTCI Content Team',
      verificationStatus: 'verified',
      createdBy: adminId,
    },
    {
      name: 'Diani Beach',
      slug: 'diani-beach',
      county: 'Kwale',
      locality: 'Diani',
      category: 'beach',
      status: 'published' as const,
      location: ST_DIANI,
      shortDescription: 'A 17-kilometre stretch of pristine white coral-derived sand on Kenya\'s south coast, widely regarded as one of the finest beaches in Africa.',
      fullDescription: 'Diani Beach is a 17-kilometre stretch of pristine white coral-derived sand on Kenya\'s south coast, widely regarded as one of the finest beaches in Africa. Fronted by a fringing coral reef that creates a calm, shallow lagoon, it has developed into Kenya\'s most established beach tourism destination.\n\nThe beach offers a blend of luxury resorts, vibrant marine life, and easy access to world-class marine parks. Separated from Mombasa by the Likoni Ferry channel, the beach is backed by casuarina and coconut palm woodland and serves as the primary gateway to the Kisite-Mpunguti Marine National Park and the Diani-Chale Marine National Reserve.',
      significance: 'Gateway to Kisite-Mpunguti Marine National Park (39 km²) and Diani-Chale Marine National Reserve (75 km²). The fringing coral reef supports 250+ fish species and 56+ coral genera. Seasonal visitors include humpback whales (July-October) and whale sharks (October-March).',
      history: 'Diani Beach has been a major tourism destination since the 1970s. The Diani-Chale Marine National Reserve was established in 1995 to protect the coastal and marine habitat. Kisite-Mpunguti Marine National Park, established in 1978, is home to approximately 70 resident dolphins.',
      thingsToDo: 'Snorkeling in the shallow lagoon behind the reef crest, Scuba diving at PADI/SSI certified centres, Kitesurfing (best April-October during Kusi monsoon), Stand-up paddleboarding, Kayaking including mangrove channel exploration, Glass-bottom boat tours, Whale shark snorkeling excursions (October-March), Dolphin-watching boat trips (80%+ sighting rate), Deep-sea fishing, Traditional dhow sunset cruises, Day trips to Kisite-Mpunguti Marine National Park, Day trips to Shimba Hills National Reserve, Cultural visit to Shimoni slave caves, Wasini Island cultural tours',
      suitableAudiences: 'Beach lovers, Divers, Families, Adventure seekers, Honeymooners, Water sports enthusiasts',
      duration: '3-7 days recommended',
      difficulty: 'easy',
      seasonality: 'November to March for calmest seas and best underwater visibility. April-October ideal for kitesurfing (strong southeast trade winds). Year-round warm temperatures (25-29°C).',
      indicativeFees: 'Free public beach access. Resort day passes USD 30-80. Dive packages from USD 80/dive. Kitesurfing lessons from USD 100/session.',
      openingInfo: 'Beach accessible 24/7. Marine park hours: 8:00 AM to 5:00 PM. Dive centres typically operate 7:00 AM to 5:00 PM.',
      transportAccessRoute: '30 km south of Mombasa via Likoni Ferry. Served by Ukunda Airstrip with domestic flights from Wilson Airport, Nairobi (1 hour). Road access from Nairobi approximately 8 hours.',
      accessibility: 'Beach has flat access from main road. Some resorts offer wheelchair-accessible facilities. Boat excursions may have limited accessibility.',
      facilities: 'Luxury resorts, Budget hotels, Restaurants, Dive centres, Water sports rental, Beach bars, spas',
      safetyNotes: 'Swim within designated areas. Respect coral reef — do not touch or stand on coral. Use reef-safe sunscreen. Be aware of tidal patterns. Follow boat operator safety instructions.',
      source: 'Kenya Tourism Board, KWS',
      contentOwner: 'YTCI Content Team',
      verificationStatus: 'verified',
      createdBy: adminId,
    },
  ]

  await db.insert(destinations).values(destinationValues as any)

  console.log('Created 2 destinations')
}

// ──────────────────────── Courses ────────────────────────

async function seedCourses(adminId: string) {
  const existing = await db.select({ id: courses.id }).from(courses).limit(1)
  if (existing.length > 0) {
    console.log('Courses already seeded, skipping')
    return
  }

  // Course 1: Beginner
  const [c1] = await db.insert(courses).values({
    title: 'Introduction to Wildlife Conservation',
    description: 'Learn the fundamentals of wildlife conservation in Kenya, including ecosystem dynamics, threats to biodiversity, and community-based conservation approaches.',
    category: 'Conservation',
    difficulty: 'beginner',
    status: 'published',
    passThreshold: 70,
    badgeName: 'Wildlife Explorer',
    certificateEnabled: true,
    createdBy: adminId,
  }).returning({ id: courses.id })

  await db.insert(lessons).values([
    { courseId: c1.id, title: 'What is Conservation?', description: 'Understanding the basics of wildlife conservation and why it matters.', contentType: 'text', duration: 15, displayOrder: 0 },
    { courseId: c1.id, title: 'Kenya\'s Biodiversity Hotspots', description: 'Explore the key ecosystems that make Kenya a biodiversity hotspot.', contentType: 'video', contentUrl: 'https://example.com/videos/kenya-biodiversity.mp4', duration: 20, displayOrder: 1 },
    { courseId: c1.id, title: 'Threats to Wildlife', description: 'Learn about the major threats facing Kenya\'s wildlife populations.', contentType: 'text', duration: 12, displayOrder: 2 },
    { courseId: c1.id, title: 'Conservation Careers Guide', description: 'PDF guide to careers in wildlife conservation.', contentType: 'pdf', contentUrl: 'https://example.com/pdfs/conservation-careers.pdf', duration: 10, displayOrder: 3 },
  ])

  await db.insert(quizzes).values({
    courseId: c1.id,
    title: 'Wildlife Conservation Basics Quiz',
    questions: [
      { id: 'q1', text: 'What are the "Big Five" animals in Kenya?', options: ['Lion, Leopard, Elephant, Buffalo, Rhino', 'Lion, Tiger, Elephant, Buffalo, Rhino', 'Lion, Leopard, Giraffe, Buffalo, Rhino', 'Lion, Leopard, Elephant, Zebra, Rhino'], correctIndex: 0 },
      { id: 'q2', text: 'Which is the largest ecosystem in Kenya?', options: ['Coastal forest', 'Savannah grassland', 'Montane forest', 'Desert'], correctIndex: 1 },
      { id: 'q3', text: 'What is the primary cause of habitat loss in Kenya?', options: ['Climate change', 'Agriculture and urbanisation', 'Wildfires', 'Mining'], correctIndex: 1 },
      { id: 'q4', text: 'Which community-based conservation model is famous in Kenya?', options: ['National parks only', 'Wildlife conservancies', 'Zoos', 'Aquariums'], correctIndex: 1 },
      { id: 'q5', text: 'What percentage of Kenya\'s land area is protected?', options: ['About 8%', 'About 20%', 'About 35%', 'About 50%'], correctIndex: 0 },
    ],
    passThreshold: 70,
  }).returning({ id: quizzes.id })

  // Course 2: Intermediate
  const [c2] = await db.insert(courses).values({
    title: 'Sustainable Eco-Tourism Practices',
    description: 'Develop skills in sustainable tourism management, balancing economic benefits with environmental and cultural preservation.',
    category: 'Tourism',
    difficulty: 'intermediate',
    status: 'published',
    passThreshold: 75,
    badgeName: 'Eco-Tourism Guide',
    certificateEnabled: true,
    createdBy: adminId,
  }).returning({ id: courses.id })

  await db.insert(lessons).values([
    { courseId: c2.id, title: 'Principles of Sustainable Tourism', description: 'The triple bottom line: people, planet, profit.', contentType: 'text', duration: 18, displayOrder: 0 },
    { courseId: c2.id, title: 'Carbon Footprint in Tourism', description: 'Understanding and reducing tourism-related emissions.', contentType: 'video', contentUrl: 'https://example.com/videos/carbon-footprint.mp4', duration: 22, displayOrder: 1 },
    { courseId: c2.id, title: 'Community-Based Tourism', description: 'How local communities benefit from and lead tourism initiatives.', contentType: 'text', duration: 15, displayOrder: 2 },
    { courseId: c2.id, title: 'Waste Management for Tour Operators', description: 'Best practices for reducing waste in tourism operations.', contentType: 'video', contentUrl: 'https://example.com/videos/waste-management.mp4', duration: 18, displayOrder: 3 },
    { courseId: c2.id, title: 'Eco-Certification Standards', description: 'Overview of global and local eco-certification programmes.', contentType: 'text', duration: 12, displayOrder: 4 },
    { courseId: c2.id, title: 'Sustainable Tourism Toolkit', description: 'PDF toolkit with templates, checklists, and best practice guides for tour operators.', contentType: 'pdf', contentUrl: 'https://example.com/pdfs/sustainable-tourism-toolkit.pdf', duration: 10, displayOrder: 5 },
  ])

  await db.insert(quizzes).values({
    courseId: c2.id,
    title: 'Sustainable Tourism Practices Quiz',
    questions: [
      { id: 'q1', text: 'What are the three pillars of sustainable tourism?', options: ['Economic, Environmental, Social', 'Profit, Production, Progress', 'People, Power, Prosperity', 'Nature, Culture, Commerce'], correctIndex: 0 },
      { id: 'q2', text: 'What does "carbon offsetting" mean?', options: ['Eliminating all carbon emissions', 'Compensating for emissions by funding equivalent reductions', 'Planting trees only', 'Using electric vehicles'], correctIndex: 1 },
      { id: 'q3', text: 'Which is a key principle of community-based tourism?', options: ['Maximise tourist numbers', 'Local ownership and benefit sharing', 'Build large resorts', 'Import foreign staff'], correctIndex: 1 },
      { id: 'q4', text: 'What is greenwashing in tourism?', options: ['Eco-friendly cleaning', 'Misleading claims about environmental practices', 'Water conservation', 'Recycling programmes'], correctIndex: 1 },
      { id: 'q5', text: 'Which certification is recognised for sustainable tourism?', options: ['ISO 9001', 'Green Globe', 'Fair Trade', 'All of the above'], correctIndex: 3 },
      { id: 'q6', text: 'What is the carrying capacity of a destination?', options: ['Maximum number of buildings', 'Maximum number of visitors without degradation', 'Total land area', 'Number of hotel rooms'], correctIndex: 1 },
    ],
    passThreshold: 75,
  })

  // Course 3: Advanced
  const [c3] = await db.insert(courses).values({
    title: 'Advanced Conservation Management',
    description: 'Master advanced conservation strategies including spatial planning, species monitoring, and policy development for protected areas.',
    category: 'Conservation',
    difficulty: 'advanced',
    status: 'published',
    passThreshold: 80,
    badgeName: 'Conservation Leader',
    certificateEnabled: true,
    createdBy: adminId,
  }).returning({ id: courses.id })

  await db.insert(lessons).values([
    { courseId: c3.id, title: 'Conservation Planning Frameworks', description: 'Systematic approaches to conservation area planning and management.', contentType: 'text', duration: 25, displayOrder: 0 },
    { courseId: c3.id, title: 'Remote Sensing for Wildlife Monitoring', description: 'Using satellite imagery and drones for population surveys.', contentType: 'video', contentUrl: 'https://example.com/videos/remote-sensing.mp4', duration: 30, displayOrder: 1 },
    { courseId: c3.id, title: 'Human-Wildlife Conflict Mitigation', description: 'Strategies for reducing conflict between communities and wildlife.', contentType: 'text', duration: 20, displayOrder: 2 },
    { courseId: c3.id, title: 'Policy and Legislation', description: 'PDF overview of Kenya\'s wildlife laws and international agreements.', contentType: 'pdf', contentUrl: 'https://example.com/pdfs/wildlife-policy.pdf', duration: 15, displayOrder: 3 },
    { courseId: c3.id, title: 'Climate Change Adaptation', description: 'How conservation areas can adapt to changing climate conditions.', contentType: 'video', contentUrl: 'https://example.com/videos/climate-adaptation.mp4', duration: 22, displayOrder: 4 },
    { courseId: c3.id, title: 'Funding and Partnerships', description: 'Securing sustainable funding for conservation through partnerships and grants.', contentType: 'text', duration: 18, displayOrder: 5 },
  ])

  await db.insert(quizzes).values({
    courseId: c3.id,
    title: 'Advanced Conservation Management Quiz',
    questions: [
      { id: 'q1', text: 'What is systematic conservation planning?', options: ['Random site selection', 'A data-driven approach to prioritise areas for protection', 'Building fences around parks', 'Counting animals only'], correctIndex: 1 },
      { id: 'q2', text: 'What does GIS stand for?', options: ['Global Information System', 'Geographic Information System', 'General Investigation System', 'Geo-Intelligence Service'], correctIndex: 1 },
      { id: 'q3', text: 'Which is an effective human-wildlife conflict mitigation tool?', options: ['Electric fences', 'Beehive fences', 'Noise cannons', 'All of the above'], correctIndex: 3 },
      { id: 'q4', text: 'What is the Convention on Biological Diversity?', options: ['A zoo', 'An international treaty for biodiversity conservation', 'A company', 'A documentary'], correctIndex: 1 },
      { id: 'q5', text: 'What is adaptive management in conservation?', options: ['Fixed plans that never change', 'Iterative approach that adjusts strategies based on monitoring data', 'Ignoring scientific evidence', 'Leaving nature alone'], correctIndex: 1 },
      { id: 'q6', text: 'What is a biodiversity hotspot?', options: ['Any forest', 'Area with significant endemic species under threat', 'A popular tourist spot', 'A volcanic region'], correctIndex: 1 },
      { id: 'q7', text: 'What is the role of wildlife corridors?', options: ['Tourist paths', 'Connect fragmented habitats to allow species movement', 'Road crossings', 'Fishing routes'], correctIndex: 1 },
      { id: 'q8', text: 'What is payment for ecosystem services (PES)?', options: ['Charging tourists entry fees', 'Compensating landowners for maintaining ecosystem health', 'Selling wildlife products', 'Donations to charities'], correctIndex: 1 },
    ],
    passThreshold: 80,
  })

  // Course enrollments
  const aliceId = await getUserId('alice@example.com')
  const bobId = await getUserId('bob@example.com')
  const carolId = await getUserId('carol@example.com')

  if (aliceId) {
    await db.insert(courseEnrollments).values({
      userId: aliceId,
      courseId: c1.id,
      completedLessonIds: JSON.stringify([0, 1]),
      quizAttempts: JSON.stringify({}),
    })
  }
  if (bobId) {
    await db.insert(courseEnrollments).values({
      userId: bobId,
      courseId: c1.id,
      completedLessonIds: JSON.stringify([0, 1, 2, 3]),
      quizAttempts: JSON.stringify({ q1_quiz: { score: 85, passed: true } }),
      certificateUrl: 'https://example.com/certificates/bob-wildlife-explorer.pdf',
      completedAt: new Date(),
    })
  }
  if (carolId) {
    await db.insert(courseEnrollments).values({
      userId: carolId,
      courseId: c2.id,
      completedLessonIds: JSON.stringify([0]),
      quizAttempts: JSON.stringify({}),
    })
  }

  console.log('Created 3 courses with lessons, quizzes, and enrollments')
}

// ──────────────────────── Events ────────────────────────

async function seedEvents(adminId: string) {
  const existing = await db.select({ id: events.id }).from(events).limit(1)
  if (existing.length > 0) {
    console.log('Events already seeded, skipping')
    return
  }

  const eventValues = [
    {
      title: 'Maasai Cultural Festival',
      organizer: 'Narok County Government',
      county: 'Narok',
      venue: 'Maasai Mara National Reserve Amphitheatre',
      eventDate: '2026-09-15',
      endDate: '2026-09-17',
      type: 'cultural' as const,
      status: 'scheduled' as const,
      description: 'Annual celebration of Maasai culture featuring traditional dances, beadwork workshops, warrior demonstrations, and storytelling sessions. Experience authentic Maasai traditions and support community-led conservation.',
      contactEmail: 'events@narokcounty.go.ke',
      contactPhone: '+254 51 22144',
      startTime: '09:00',
      endTime: '18:00',
      entryFee: 'KES 2,000 adult, KES 500 child',
      locationLat: -1.4900,
      locationLng: 35.1400,
      createdBy: adminId,
    },
    {
      title: 'Lamu Cultural Heritage Festival',
      organizer: 'Lamu County Tourism Board',
      county: 'Lamu',
      venue: 'Lamu Old Town Waterfront',
      eventDate: '2026-10-20',
      endDate: '2026-10-22',
      type: 'cultural' as const,
      status: 'scheduled' as const,
      description: 'Celebrate the rich Swahili heritage of Lamu with dhow races, Swahili cuisine workshops, poetry readings, and traditional music performances in the UNESCO World Heritage Old Town.',
      contactEmail: 'tourism@lamu.go.ke',
      contactPhone: '+254 42 632096',
      startTime: '10:00',
      endTime: '20:00',
      entryFee: 'Free entry, some events ticketed',
      locationLat: -2.2717,
      locationLng: 40.9020,
      createdBy: adminId,
    },
    {
      title: 'Nairobi City Marathon',
      organizer: 'Athletics Kenya',
      county: 'Nairobi',
      venue: 'Uhuru Gardens National Monument',
      eventDate: '2026-11-08',
      type: 'sports' as const,
      status: 'scheduled' as const,
      description: 'Annual marathon through Nairobi\'s iconic streets, featuring 42km, 21km, 10km, and 5km categories. The route passes through the Nairobi National Park perimeter, offering runners wildlife sighting opportunities.',
      contactEmail: 'info@athleticskenya.co.ke',
      contactPhone: '+254 20 2710768',
      startTime: '06:00',
      endTime: '14:00',
      entryFee: 'KES 3,000 (42km), KES 2,000 (21km), KES 1,000 (10km), KES 500 (5km)',
      locationLat: -1.2921,
      locationLng: 36.8219,
      createdBy: adminId,
    },
    {
      title: 'Indian Ocean Beach Cleanup Drive',
      organizer: 'Ocean Conservancy Kenya',
      county: 'Kwale',
      venue: 'Diani Beach Public Access Point',
      eventDate: '2026-08-25',
      type: 'conservation' as const,
      status: 'scheduled' as const,
      description: 'Join hundreds of volunteers in the annual beach cleanup along Diani Beach. Equipment and refreshments provided. Participants receive a certificate of contribution and an eco-warrior badge.',
      contactEmail: 'cleanup@oceanconservancyke.org',
      contactPhone: '+254 40 230882',
      startTime: '07:00',
      endTime: '13:00',
      entryFee: 'Free',
      locationLat: -4.3222,
      locationLng: 39.5750,
      createdBy: adminId,
    },
    {
      title: 'Rift Valley Reforestation Day',
      organizer: 'Green Belt Movement',
      county: 'Nakuru',
      venue: 'Menengai Crater Forest Reserve',
      eventDate: '2026-07-30',
      type: 'conservation' as const,
      status: 'postponed' as const,
      description: 'Large-scale tree planting event at Menengai Crater. Target: plant 5,000 indigenous tree seedlings. Postponed due to heavy rainfall — new date to be announced.',
      contactEmail: 'events@greenbeltmovement.org',
      contactPhone: '+254 20 4020256',
      startTime: '08:00',
      endTime: '15:00',
      entryFee: 'Free',
      locationLat: -0.2000,
      locationLng: 36.0700,
      createdBy: adminId,
    },
    {
      title: 'Kenya Tourism Expo 2026',
      organizer: 'Kenya Tourism Board',
      county: 'Nairobi',
      venue: 'Kenyatta International Convention Centre',
      eventDate: '2026-06-15',
      endDate: '2026-06-17',
      type: 'tourism' as const,
      status: 'cancelled' as const,
      description: 'Annual tourism trade fair showcasing Kenya\'s diverse tourism products. Featuring international buyers, destination marketing, and B2B networking. Cancelled due to venue scheduling conflicts.',
      contactEmail: 'expo@tourism.go.ke',
      contactPhone: '+254 20 2713744',
      startTime: '09:00',
      endTime: '17:00',
      entryFee: 'Trade only — free for registered attendees',
      locationLat: -1.2931,
      locationLng: 36.8219,
      createdBy: adminId,
    },
  ]

  const insertedEvents = await db.insert(events).values(eventValues as any).returning({ id: events.id, title: events.title })

  // Add highlights to scheduled events
  const festival = insertedEvents.find((e) => e.title === 'Maasai Cultural Festival')
  if (festival) {
    await db.insert(eventHighlights).values([
      { eventId: festival.id, label: 'Traditional Maasai Dance Performances', icon: 'music', displayOrder: 0 },
      { eventId: festival.id, label: 'Beadwork & Craft Workshops', icon: 'palette', displayOrder: 1 },
      { eventId: festival.id, label: 'Warrior Demonstrations', icon: 'shield', displayOrder: 2 },
    ])
  }

  const marathon = insertedEvents.find((e) => e.title === 'Nairobi City Marathon')
  if (marathon) {
    await db.insert(eventHighlights).values([
      { eventId: marathon.id, label: '42km Full Marathon', icon: 'runner', displayOrder: 0 },
      { eventId: marathon.id, label: '21km Half Marathon', icon: 'runner', displayOrder: 1 },
      { eventId: marathon.id, label: '5km Family Fun Run', icon: 'users', displayOrder: 2 },
    ])
  }

  const cleanup = insertedEvents.find((e) => e.title === 'Indian Ocean Beach Cleanup Drive')
  if (cleanup) {
    await db.insert(eventHighlights).values([
      { eventId: cleanup.id, label: 'Equipment Provided', icon: 'trash', displayOrder: 0 },
      { eventId: cleanup.id, label: 'Refreshments & Lunch', icon: 'coffee', displayOrder: 1 },
    ])
  }

  // Add event attendees
  const aliceId = await getUserId('alice@example.com')
  const bobId = await getUserId('bob@example.com')
  const carolId = await getUserId('carol@example.com')
  const frankId = await getUserId('frank@example.com')

  if (festival && aliceId && bobId) {
    await db.insert(eventAttendees).values([
      { eventId: festival.id, userId: aliceId, status: 'joined' },
      { eventId: festival.id, userId: bobId, status: 'interested' },
    ])
  }
  if (marathon && carolId && frankId) {
    await db.insert(eventAttendees).values([
      { eventId: marathon.id, userId: carolId, status: 'joined' },
      { eventId: marathon.id, userId: frankId, status: 'joined' },
    ])
  }
  if (cleanup && aliceId) {
    await db.insert(eventAttendees).values([
      { eventId: cleanup.id, userId: aliceId, status: 'joined' },
    ])
  }

  console.log('Created 6 events with highlights and attendees')
}

// ──────────────────────── Challenges ────────────────────────

async function seedChallenges(adminId: string) {
  const existing = await db.select({ id: challenges.id }).from(challenges).limit(1)
  if (existing.length > 0) {
    console.log('Challenges already seeded, skipping')
    return
  }

  const insertedChallenges = await db.insert(challenges).values([
    {
      title: '30-Day Bird Watching Challenge',
      description: 'Spot and identify 30 different bird species across Kenya in 30 days. Log each sighting with a photo or description. Perfect for building observation skills and learning about avian biodiversity.',
      rules: '1. Each species must be positively identified.\n2. Sighting must include location and date.\n3. Photos encouraged but not mandatory.\n4. Duplicate sightings of the same species do not count.\n5. Must be submitted within the challenge period.',
      badgeName: 'Bird Watcher',
      eligibility: JSON.stringify({ minAge: 12, roles: ['user', 'moderator', 'county_officer'] }),
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'active',
      createdBy: adminId,
    },
    {
      title: 'Zero Waste Week',
      description: 'Reduce your personal waste output to zero for 7 consecutive days. Track your waste reduction strategies and share tips with the community. Learn about composting, recycling, and mindful consumption.',
      rules: '1. Track all waste produced for 7 days.\n2. Must demonstrate reduction strategies.\n3. Share at least one tip with the community.\n4. Honour system — self-reported.\n5. Badge awarded upon completion.',
      badgeName: 'Eco Warrior',
      eligibility: JSON.stringify({ minAge: 16, roles: ['user'] }),
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      status: 'active',
      createdBy: adminId,
    },
    {
      title: 'Wildlife Photography Contest',
      description: 'Submit your best wildlife photograph taken in a Kenyan conservation area. Judged on composition, storytelling, and technical quality. Winners featured on YTCI Explorer.',
      rules: '1. Photo must be taken in Kenya.\n2. Must include a wild animal in its natural habitat.\n3. No captive or staged animals.\n4. One submission per participant.\n5. Metadata must be verifiable.',
      badgeName: 'Shutter Bug',
      eligibility: JSON.stringify({ minAge: 14, roles: ['user'] }),
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      status: 'ended',
      createdBy: adminId,
    },
    {
      title: 'Campus Clean-Up Drive',
      description: 'Organise and lead a clean-up event at your school or university campus. Document the before-and-after transformation and share your impact metrics with the YTCI community.',
      rules: '1. Must be held at an educational institution.\n2. Minimum 10 participants.\n3. Document with before/after photos.\n4. Report total waste collected.\n5. Badge awarded upon verification.',
      badgeName: 'Community Hero',
      eligibility: JSON.stringify({ minAge: 14, roles: ['user'], maxAge: 25 }),
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      status: 'draft',
      createdBy: adminId,
    },
  ]).returning({ id: challenges.id, title: challenges.title })

  // Challenge progress entries
  const aliceId = await getUserId('alice@example.com')
  const bobId = await getUserId('bob@example.com')
  const carolId = await getUserId('carol@example.com')
  const frankId = await getUserId('frank@example.com')
  const eveId = await getUserId('eve@example.com')

  const birdChallenge = insertedChallenges.find((c) => c.title === '30-Day Bird Watching Challenge')
  const zeroWasteChallenge = insertedChallenges.find((c) => c.title === 'Zero Waste Week')
  const photoChallenge = insertedChallenges.find((c) => c.title === 'Wildlife Photography Contest')

  if (birdChallenge && aliceId && bobId && carolId) {
    await db.insert(challengeProgress).values([
      { userId: aliceId, challengeId: birdChallenge.id, status: 'joined', progress: JSON.stringify({ speciesSpotted: 0 }) },
      { userId: bobId, challengeId: birdChallenge.id, status: 'in_progress', progress: JSON.stringify({ speciesSpotted: 12, daysCompleted: 14 }) },
      { userId: carolId, challengeId: birdChallenge.id, status: 'submitted', progress: JSON.stringify({ speciesSpotted: 30, daysCompleted: 30 }), evidence: JSON.stringify({ totalSpecies: 30, photos: 25 }) },
    ])
  }

  if (zeroWasteChallenge && frankId && eveId) {
    await db.insert(challengeProgress).values([
      { userId: frankId, challengeId: zeroWasteChallenge.id, status: 'approved', progress: JSON.stringify({ wasteCollected: '0kg', daysCompleted: 7 }), badgeAwardedAt: new Date() },
      { userId: eveId, challengeId: zeroWasteChallenge.id, status: 'in_progress', progress: JSON.stringify({ wasteCollected: '0.5kg', daysCompleted: 3 }) },
    ])
  }

  if (photoChallenge && aliceId && bobId) {
    await db.insert(challengeProgress).values([
      { userId: aliceId, challengeId: photoChallenge.id, status: 'approved', progress: JSON.stringify({ submission: 'lion-at-sunset.jpg' }), badgeAwardedAt: new Date('2026-07-05'), moderatedBy: adminId, moderationNote: 'Excellent composition and lighting' },
      { userId: bobId, challengeId: photoChallenge.id, status: 'rejected', progress: JSON.stringify({ submission: 'zoo-photo.jpg' }), moderatedBy: adminId, moderationNote: 'Photo appears to be taken in a captive environment' },
    ])
  }

  console.log('Created 4 challenges with progress entries')
}

// ──────────────────────── Conservation Activities ────────────────────────

async function seedConservationActivities(adminId: string) {
  const existing = await db.select({ id: conservationActivities.id }).from(conservationActivities).limit(1)
  if (existing.length > 0) {
    console.log('Conservation activities already seeded, skipping')
    return
  }

  const ST_MARA_RIVER = sql`ST_SetSRID(ST_MakePoint(35.0500, -1.5200), 4326)`
  const ST_KARURA = sql`ST_SetSRID(ST_MakePoint(36.7833, -1.2833), 4326)`
  const ST_DIANI = sql`ST_SetSRID(ST_MakePoint(39.5750, -4.3222), 4326)`
  const ST_NAIROBI = sql`ST_SetSRID(ST_MakePoint(36.8167, -1.2833), 4326)`
  const ST_AMBOSELI = sql`ST_SetSRID(ST_MakePoint(37.2500, -2.6500), 4326)`

  const insertedActivities = await db.insert(conservationActivities).values([
    {
      title: 'Mara River Cleanup',
      organizer: 'WWF Kenya',
      description: 'Annual cleanup of the Mara River and its tributaries targeting illegal waste dumping. Activities include riverbank waste collection, water quality testing, and community education on river conservation.',
      location: ST_MARA_RIVER,
      locationLabel: 'Mara River, Narok County',
      privacyLevel: 'public',
      eventDate: '2026-09-10',
      impactMetric: 'kg waste collected',
      impactTarget: 500,
      impactActual: 120,
      measurementUnit: 'kg',
      participantLimit: 50,
      currentParticipants: 2,
      status: 'open',
      badgeName: 'River Guardian',
      createdBy: adminId,
    },
    {
      title: 'Karura Forest Tree Planting',
      organizer: 'Green Belt Movement',
      description: 'Community tree planting event at Karura Forest, one of Nairobi\'s largest urban forests. Aim to plant 1,000 indigenous seedlings to restore degraded areas and create wildlife corridors.',
      location: ST_KARURA,
      locationLabel: 'Karura Forest, Nairobi',
      privacyLevel: 'public',
      eventDate: '2026-08-20',
      impactMetric: 'trees planted',
      impactTarget: 1000,
      impactActual: 340,
      measurementUnit: 'trees',
      participantLimit: 100,
      currentParticipants: 3,
      status: 'open',
      badgeName: 'Tree Planter',
      createdBy: adminId,
    },
    {
      title: 'Diani Coral Reef Survey',
      organizer: 'Kenya Wildlife Service',
      description: 'Underwater survey of the Diani-Chale coral reef system to assess reef health, document species diversity, and identify areas of bleaching or damage. Divers needed for transect surveys.',
      location: ST_DIANI,
      locationLabel: 'Diani Reef, Kwale County',
      privacyLevel: 'approximate',
      eventDate: '2026-07-15',
      impactMetric: 'reef sections surveyed',
      impactTarget: 50,
      impactActual: 50,
      measurementUnit: 'sections',
      participantLimit: 20,
      currentParticipants: 4,
      status: 'full',
      badgeName: 'Reef Ranger',
      createdBy: adminId,
    },
    {
      title: 'Nairobi Urban Beehive Monitoring',
      organizer: 'Nairobi County Government',
      description: 'Monthly monitoring of urban beehives across Nairobi\'s green spaces. Activities include hive inspection, honey harvest, and pollinator count. Supports the Nairobi Urban Beekeeping Programme.',
      location: ST_NAIROBI,
      locationLabel: 'Various locations, Nairobi',
      privacyLevel: 'public',
      eventDate: '2026-06-01',
      impactMetric: 'hives inspected',
      impactTarget: 20,
      impactActual: 22,
      measurementUnit: 'hives',
      participantLimit: 15,
      currentParticipants: 3,
      status: 'completed',
      badgeName: 'Bee Guardian',
      createdBy: adminId,
    },
    {
      title: 'Amboseli Elephant Tracking',
      organizer: 'Save the Elephants',
      description: 'GPS collar monitoring and population census of the Amboseli elephant herd. Activities cancelled due to security advisory in the region.',
      location: ST_AMBOSELI,
      locationLabel: 'Amboseli National Park, Kajiado County',
      privacyLevel: 'hidden',
      impactMetric: 'elephants tracked',
      impactTarget: 30,
      measurementUnit: 'elephants',
      participantLimit: 10,
      currentParticipants: 0,
      status: 'cancelled',
      createdBy: adminId,
    },
  ]).returning({ id: conservationActivities.id, title: conservationActivities.title })

  // Conservation participants
  const aliceId = await getUserId('alice@example.com')
  const bobId = await getUserId('bob@example.com')
  const carolId = await getUserId('carol@example.com')
  const frankId = await getUserId('frank@example.com')
  const eveId = await getUserId('eve@example.com')

  const maraCleanup = insertedActivities.find((a) => a.title === 'Mara River Cleanup')
  const karuraPlanting = insertedActivities.find((a) => a.title === 'Karura Forest Tree Planting')
  const reefSurvey = insertedActivities.find((a) => a.title === 'Diani Coral Reef Survey')
  const beehiveMonitoring = insertedActivities.find((a) => a.title === 'Nairobi Urban Beehive Monitoring')

  if (maraCleanup && aliceId && bobId) {
    await db.insert(conservationParticipants).values([
      { userId: aliceId, activityId: maraCleanup.id },
      { userId: bobId, activityId: maraCleanup.id },
    ])
  }

  if (karuraPlanting && aliceId && carolId && frankId) {
    await db.insert(conservationParticipants).values([
      { userId: aliceId, activityId: karuraPlanting.id },
      { userId: carolId, activityId: karuraPlanting.id },
      { userId: frankId, activityId: karuraPlanting.id },
    ])
  }

  if (reefSurvey && aliceId && bobId && carolId && frankId) {
    await db.insert(conservationParticipants).values([
      { userId: aliceId, activityId: reefSurvey.id },
      { userId: bobId, activityId: reefSurvey.id },
      { userId: carolId, activityId: reefSurvey.id },
      { userId: frankId, activityId: reefSurvey.id },
    ])
  }

  if (beehiveMonitoring && eveId && bobId && carolId) {
    await db.insert(conservationParticipants).values([
      { userId: eveId, activityId: beehiveMonitoring.id },
      { userId: bobId, activityId: beehiveMonitoring.id },
      { userId: carolId, activityId: beehiveMonitoring.id },
    ])
  }

  // Conservation evidence
  if (karuraPlanting && aliceId && carolId) {
    await db.insert(conservationEvidence).values([
      {
        userId: aliceId,
        activityId: karuraPlanting.id,
        description: 'Planted 25 indigenous seedlings along the northern trail. Mix of Fig, Croton, and Prunus species.',
        treesPlanted: 25,
        hoursSpent: 4,
        lat: -1.2833,
        lng: 36.7833,
        status: 'approved',
        moderatedBy: adminId,
        moderatedAt: new Date(),
      },
      {
        userId: carolId,
        activityId: karuraPlanting.id,
        description: 'Planted 18 seedlings near the wetland area. All seedlings sourced from Kenya Forest Service nursery.',
        treesPlanted: 18,
        hoursSpent: 3,
        lat: -1.2840,
        lng: 36.7820,
        status: 'pending',
      },
    ])
  }

  if (beehiveMonitoring && eveId) {
    await db.insert(conservationEvidence).values([
      {
        userId: eveId,
        activityId: beehiveMonitoring.id,
        description: 'Inspected 8 hives in Uhuru Park. All hives healthy, estimated 200kg total honey yield.',
        hoursSpent: 5,
        lat: -1.2921,
        lng: 36.8219,
        status: 'approved',
        moderatedBy: adminId,
        moderatedAt: new Date(),
      },
      {
        userId: eveId,
        activityId: beehiveMonitoring.id,
        description: 'Inspected 6 hives in Central Park. 2 hives showed signs of pest infestation — treatment applied.',
        hoursSpent: 3,
        lat: -1.2833,
        lng: 36.8167,
        status: 'approved',
        moderatedBy: adminId,
        moderatedAt: new Date(),
      },
    ])
  }

  if (maraCleanup && aliceId) {
    await db.insert(conservationEvidence).values([
      {
        userId: aliceId,
        activityId: maraCleanup.id,
        description: 'Collected 15kg of plastic waste along 2km of riverbank. Most common items: water bottles and food packaging.',
        hoursSpent: 3,
        lat: -1.5200,
        lng: 35.0500,
        status: 'pending',
      },
    ])
  }

  console.log('Created 5 conservation activities with participants and evidence')
}

// ──────────────────────── Supporting Data ────────────────────────

async function seedSupportingData(adminId: string) {
  const existingStories = await db.select({ id: stories.id }).from(stories).limit(1)
  if (existingStories.length > 0) {
    console.log('Supporting data already seeded, skipping')
    return
  }

  const aliceId = await getUserId('alice@example.com')
  const bobId = await getUserId('bob@example.com')
  const frankId = await getUserId('frank@example.com')
  const [maraiMaraDest] = await db.select({ id: destinations.id }).from(destinations).where(eq(destinations.slug, 'maasai-mara-national-reserve')).limit(1)
  const [dianiDest] = await db.select({ id: destinations.id }).from(destinations).where(eq(destinations.slug, 'diani-beach')).limit(1)

  // Ensure admin has a profile
  await db.insert(userProfiles).values({
    userId: adminId,
    createdBy: adminId,
    displayName: 'Admin User',
  }).onConflictDoNothing()

  // Stories
  if (aliceId && maraiMaraDest) {
    const [story1] = await db.insert(stories).values({
      creatorId: aliceId,
      destinationId: maraiMaraDest.id,
      caption: 'Incredible lion sighting at Maasai Mara!',
      journal: 'We spent three days at the Mara and on the second morning, we found a pride of lions resting near a termite mound. The cubs were playful and curious. One of the most memorable wildlife experiences of my life.',
      tags: 'safari,maasai-mara,lions,wildlife',
      status: 'approved',
      likeCount: 12,
      saveCount: 5,
      viewCount: 89,
    }).returning({ id: stories.id })

    // Story interactions
    if (bobId) {
      await db.insert(storyInteractions).values([
        { userId: bobId, storyId: story1.id, interactionType: 'like' },
      ])
    }
  }

  if (bobId && dianiDest) {
    await db.insert(stories).values({
      creatorId: bobId,
      destinationId: dianiDest.id,
      caption: 'Snorkeling at Diani Reef was magical',
      journal: 'The coral formations were stunning and we saw sea turtles, clownfish, and even a small reef shark. The dive operators were professional and safety-conscious.',
      tags: 'beach,diani-beach,snorkeling,marine-life',
      status: 'approved',
      likeCount: 8,
      saveCount: 3,
      viewCount: 56,
    })
  }

  if (frankId && maraiMaraDest) {
    await db.insert(stories).values({
      creatorId: frankId,
      destinationId: maraiMaraDest.id,
      caption: 'Sunrise over the Mara savannah',
      journal: 'Waking up at 5am for a game drive was worth it. The golden light over the plains with wildebeest silhouettes was breathtaking.',
      tags: 'safari,maasai-mara,sunrise,photography',
      status: 'pending',
    })
  }

  // Bucket list items
  if (aliceId && dianiDest) {
    await db.insert(bucketListItems).values([
      { userId: aliceId, destinationId: dianiDest.id, visited: false },
    ])
  }
  if (bobId && maraiMaraDest) {
    await db.insert(bucketListItems).values([
      { userId: bobId, destinationId: maraiMaraDest.id, visited: true, visitedAt: new Date('2026-05-15') },
    ])
  }

  console.log('Created stories, interactions, and bucket list items')
}

// ──────────────────────── Main ────────────────────────

async function main() {
  console.log('Seeding Go business tables with comprehensive test data...')

  const adminId = await getAdminId()
  if (!adminId) {
    console.error('SKIP — admin user not found. Run seed:test-users first.')
    process.exit(1)
  }

  await seedDestinations(adminId)
  await seedCourses(adminId)
  await seedEvents(adminId)
  await seedChallenges(adminId)
  await seedConservationActivities(adminId)
  await seedSupportingData(adminId)

  console.log('Done!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
