import z from 'zod'

const nullableStr = () => z.string().nullable().optional().default('')

export const destinationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case'),
  county: z.string().min(1, 'County is required'),
  locality: nullableStr(),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  latitude: z.preprocess(
    (val) => val === '' || val === null ? undefined : val,
    z.coerce.number().nullable().optional(),
  ),
  longitude: z.preprocess(
    (val) => val === '' || val === null ? undefined : val,
    z.coerce.number().nullable().optional(),
  ),
  mapLabel: nullableStr(),
  accessRoute: nullableStr(),
  distanceReference: nullableStr(),
  shortDescription: nullableStr(),
  fullDescription: nullableStr(),
  significance: nullableStr(),
  history: nullableStr(),
  thingsToDo: nullableStr(),
  suitableAudiences: nullableStr(),
  duration: nullableStr(),
  difficulty: z.enum(['easy', 'moderate', 'hard']).nullable().optional().default('easy'),
  seasonality: nullableStr(),
  indicativeFees: nullableStr(),
  openingInfo: nullableStr(),
  transportNotes: nullableStr(),
  accessibility: z.array(z.string()).nullable().optional().default([]),
  facilities: nullableStr(),
  safetyNotes: nullableStr(),
  heroImageUrl: nullableStr(),
  heroCaption: nullableStr(),
  heroCredit: nullableStr(),
  heroAlt: nullableStr(),
  gallery: z.array(z.string()).nullable().optional().default([]),
  videoUrl: nullableStr(),
  videoCaption: nullableStr(),
  videoCredit: nullableStr(),
  nearbyAttractions: nullableStr(),
  associatedEvents: nullableStr(),
  associatedStories: nullableStr(),
  associatedCourses: nullableStr(),
  associatedConservation: nullableStr(),
  source: nullableStr(),
  contentOwner: nullableStr(),
  verificationStatus: z.enum(['verified', 'unverified', 'pending']).nullable().optional().default('pending'),
  curationFlags: z.object({
    trending: z.boolean().default(false),
    hiddenGem: z.boolean().default(false),
  }).nullable().optional().default({ trending: false, hiddenGem: false }),
})

export type DestinationInput = z.input<typeof destinationSchema>
export type DestinationOutput = z.output<typeof destinationSchema>
