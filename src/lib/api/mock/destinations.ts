import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

export interface Destination {
  id: string
  name: string; slug: string; county: string; locality: string; category: string; status: 'draft' | 'published' | 'archived'
  latitude: number; longitude: number; mapLabel: string; accessRoute: string; distanceReference: string
  shortDescription: string; fullDescription: string; significance: string; history: string
  thingsToDo: string; suitableAudiences: string; duration: string; difficulty: 'easy' | 'moderate' | 'hard'; seasonality: string
  indicativeFees: string; openingInfo: string; transportNotes: string; accessibility: string[]; facilities: string; safetyNotes: string
  heroImageUrl: string; heroCaption: string; heroCredit: string; heroAlt: string
  gallery: { url: string; caption: string; credit: string; alt: string; rightsStatus: string }[]
  videoUrl: string; videoCaption: string; videoCredit: string
  nearbyAttractions: string; associatedEvents: string; associatedStories: string; associatedCourses: string; associatedConservation: string
  source: string; contentOwner: string; verificationStatus: 'verified' | 'unverified' | 'pending'; reviewedAt: string; reviewDate: string
  curationFlags: { trending: boolean; hiddenGem: boolean }
  createdAt: string; updatedAt: string
}

const now = new Date().toISOString()

const store: Destination[] = [
  {
    id: 'dest-1', name: 'Maasai Mara National Reserve', slug: 'maasai-mara', county: 'Narok', locality: 'Sekenani', category: 'wildlife', status: 'published',
    latitude: -1.4833, longitude: 35.0, mapLabel: 'Mara Triangle', accessRoute: 'Nairobi–Narok Highway (A104)', distanceReference: '270 km from Nairobi',
    shortDescription: 'World-renowned savannah and Great Migration.', fullDescription: 'The Maasai Mara National Reserve is one of Africa\'s most famous safari destinations, known for its vast savannah, abundant wildlife, and the annual Great Migration of wildebeest and zebra.',
    significance: 'UNESCO-listed, Great Migration crossing point', history: 'Established as a wildlife sanctuary in 1961.',
    thingsToDo: 'Game drives, hot air balloon safaris, cultural visits', suitableAudiences: 'Solo, Couples, Families, Groups', duration: '3–5 days recommended', difficulty: 'easy', seasonality: 'July–October peak migration; year-round wildlife',
    indicativeFees: 'KES 1,500 (citizen) / USD 80 (non-resident) per day', openingInfo: '6:00 AM – 6:00 PM daily', transportNotes: '4×4 recommended; airstrip at Musiara and Keekorok', accessibility: ['wheelchair-accessible-lodges', 'guided-tours'], facilities: 'Lodges, campsites, picnic sites, restrooms', safetyNotes: 'Follow guide instructions; stay in vehicle in reserve areas',
    heroImageUrl: 'https://r2.example.com/destinations/mara-hero.jpg', heroCaption: 'Golden hour over the Mara', heroCredit: 'Photo by Jane Doe', heroAlt: 'Sunset over the Maasai Mara savannah',
    gallery: [
      { url: 'https://r2.example.com/destinations/mara-gallery-1.jpg', caption: 'Lion resting on a rock', credit: 'Photo by John Smith', alt: 'Lion in the Mara', rightsStatus: 'cleared' },
      { url: 'https://r2.example.com/destinations/mara-gallery-2.jpg', caption: 'Wildebeest crossing river', credit: 'Photo by John Smith', alt: 'Wildebeest crossing Mara River', rightsStatus: 'cleared' },
    ],
    videoUrl: 'https://example.com/videos/mara-migration.mp4', videoCaption: 'Great Migration crossing', videoCredit: 'Video by EcoFilms',
    nearbyAttractions: 'Lake Nakuru, Hell\'s Gate', associatedEvents: 'Mara Serena Safari Rally', associatedStories: 'stories-1,stories-2', associatedCourses: 'course-1', associatedConservation: 'activity-1',
    source: 'KWS Survey 2024', contentOwner: 'Narok County Tourism', verificationStatus: 'verified', reviewedAt: '2025-06-01T00:00:00Z', reviewDate: '2025-12-01',
    curationFlags: { trending: true, hiddenGem: false },
    createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-07-25T00:00:00Z',
  },
  {
    id: 'dest-2', name: 'Diani Beach', slug: 'diani-beach', county: 'Kwale', locality: 'Diani', category: 'beach', status: 'published',
    latitude: -4.3167, longitude: 39.5833, mapLabel: 'Diani Coastline', accessRoute: 'Mombasa–Lungalunga Road (A14)', distanceReference: '30 km south of Mombasa',
    shortDescription: 'White sand beaches on the Indian Ocean coast.', fullDescription: 'Diani Beach is a stunning stretch of white sand on Kenya\'s south coast, known for its turquoise waters, coral reefs, and vibrant marine life.',
    significance: 'One of Africa\'s leading beach destinations', history: 'Developed as a resort destination from the 1970s.',
    thingsToDo: 'Snorkelling, diving, kite-surfing, dhow cruises', suitableAudiences: 'Solo, Couples, Families', duration: '4–7 days recommended', difficulty: 'easy', seasonality: 'December–March best weather; year-round destination',
    indicativeFees: 'Free access (public beach); resort fees vary', openingInfo: '24/7 public access', transportNotes: 'Matatus from Mombasa; Uber/Bolt available', accessibility: ['wheelchair-accessible-hotels', 'beach-wheelchair'], facilities: 'Hotels, restaurants, water sports centres, ATMs', safetyNotes: 'Swim in designated areas; heed lifeguard warnings; avoid after dark',
    heroImageUrl: 'https://r2.example.com/destinations/diani-hero.jpg', heroCaption: 'Aerial view of Diani coastline', heroCredit: 'Drone by EcoFilms', heroAlt: 'Aerial view of Diani Beach and coral reefs',
    gallery: [
      { url: 'https://r2.example.com/destinations/diani-gallery-1.jpg', caption: 'Coral reef at low tide', credit: 'Photo by Marine Trust', alt: 'Coral reef', rightsStatus: 'cleared' },
    ],
    videoUrl: 'https://example.com/videos/diani-snorkel.mp4', videoCaption: 'Snorkelling in the marine reserve', videoCredit: 'Video by Diani Marine',
    nearbyAttractions: 'Shimba Hills, Wasini Island', associatedEvents: 'Diani Food Festival', associatedStories: 'stories-3', associatedCourses: '', associatedConservation: 'activity-2,activity-3',
    source: 'Kwale County Survey', contentOwner: 'Diani Business Association', verificationStatus: 'verified', reviewedAt: '2025-05-15T00:00:00Z', reviewDate: '2025-11-15',
    curationFlags: { trending: false, hiddenGem: false },
    createdAt: '2025-06-02T00:00:00Z', updatedAt: '2025-07-20T00:00:00Z',
  },
  {
    id: 'dest-3', name: 'Mount Kenya', slug: 'mount-kenya', county: 'Meru', locality: 'Chogoria', category: 'adventure', status: 'published',
    latitude: -0.15, longitude: 37.3, mapLabel: 'Mount Kenya Summit', accessRoute: 'Meru–Chogoria Road', distanceReference: '180 km from Nairobi',
    shortDescription: 'Africa\'s second-highest peak and UNESCO site.', fullDescription: 'Mount Kenya is the highest mountain in Kenya and the second-highest in Africa, offering challenging climbs, diverse ecosystems from bamboo forest to glaciers, and stunning alpine scenery.',
    significance: 'UNESCO World Heritage Site', history: 'First ascended by Halford Mackinder in 1899.',
    thingsToDo: 'Mountain trekking, bird watching, camping', suitableAudiences: 'Adventure, Groups, Solo (experienced)', duration: '5–7 days for summit', difficulty: 'hard', seasonality: 'January–February, July–October best climbing windows',
    indicativeFees: 'KES 500 (citizen) / USD 30 (non-resident) park entry per day', openingInfo: 'Park gates open 6:00 AM – 6:00 PM', transportNotes: 'Public transport to Nanyuki; hire car or tour van from there', accessibility: ['guide-required'], facilities: 'Mountain huts, campsites, park HQ with toilets', safetyNotes: 'Guides mandatory for summit; carry warm clothing; altitude sickness risk; register at park gate',
    heroImageUrl: 'https://r2.example.com/destinations/kenya-hero.jpg', heroCaption: 'Mount Kenya sunrise from Point Lenana', heroCredit: 'Photo by Alpine Club', heroAlt: 'Sunrise over Mount Kenya glaciers',
    gallery: [
      { url: 'https://r2.example.com/destinations/kenya-gallery-1.jpg', caption: 'Vertical bog on the Sirimon route', credit: 'Photo by Alpine Club', alt: 'Hiking through the vertical bog', rightsStatus: 'cleared' },
    ],
    videoUrl: 'https://example.com/videos/kenya-climb.mp4', videoCaption: 'Time-lapse of a two-day ascent', videoCredit: 'Video by Alpine Club',
    nearbyAttractions: 'Nanyuki town, Ol Pejeta Conservancy', associatedEvents: 'Mount Kenya Marathon', associatedStories: 'stories-4,stories-5', associatedCourses: 'course-1', associatedConservation: '',
    source: 'KWS Survey', contentOwner: 'Meru County Tourism', verificationStatus: 'verified', reviewedAt: '2025-04-10T00:00:00Z', reviewDate: '2025-10-10',
    curationFlags: { trending: true, hiddenGem: true },
    createdAt: '2025-06-03T00:00:00Z', updatedAt: '2025-07-22T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(_params?: PaginationParams): Paginated<Record<string, unknown>> {
    return { items: store as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  get(id: string) {
    const item = store.find(d => d.id === id)
    if (!item) throw new Error('Not found')
    return item
  },
  create(body: unknown) {
    const input = body as Partial<Destination>
    const now = new Date().toISOString()
    const item: Destination = {
      id: `dest-${nextId++}`, name: input.name ?? '', slug: input.slug ?? '', county: input.county ?? '', locality: input.locality ?? '', category: input.category ?? '', status: 'draft',
      latitude: input.latitude ?? 0, longitude: input.longitude ?? 0, mapLabel: '', accessRoute: '', distanceReference: '',
      shortDescription: input.shortDescription ?? '', fullDescription: '', significance: '', history: '',
      thingsToDo: '', suitableAudiences: '', duration: '', difficulty: 'easy', seasonality: '',
      indicativeFees: '', openingInfo: '', transportNotes: '', accessibility: [], facilities: '', safetyNotes: '',
      heroImageUrl: '', heroCaption: '', heroCredit: '', heroAlt: '',
      gallery: [], videoUrl: '', videoCaption: '', videoCredit: '',
      nearbyAttractions: '', associatedEvents: '', associatedStories: '', associatedCourses: '', associatedConservation: '',
      source: '', contentOwner: '', verificationStatus: 'pending', reviewedAt: '', reviewDate: '',
      curationFlags: { trending: false, hiddenGem: false },
      createdAt: now, updatedAt: now,
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(d => d.id === id)
    if (idx === -1) throw new Error('Not found')
    const patched = { ...store[idx], ...(patch as Partial<Destination>), updatedAt: new Date().toISOString() }
    store[idx] = patched
    return patched
  },
  remove(id: string) {
    const idx = store.findIndex(d => d.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
