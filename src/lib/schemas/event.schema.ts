import z from 'zod'

const nullableString = () => z.preprocess((v) => v ?? '', z.string())
const nullableBool = (fallback: boolean) => z.preprocess((v) => v ?? fallback, z.boolean())

export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: nullableString(),
  county: z.string().min(1, 'County is required'),
  venue: nullableString(),
  date: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date()
  ).refine((d) => !Number.isNaN(d.getTime()), 'Start date is required'),
  endDate: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date().optional()
  ),
  type: nullableString(),
  description: nullableString(),
  status: z.enum(['scheduled', 'postponed', 'cancelled']).default('scheduled'),
  contactEmail: nullableString(),
  contactPhone: nullableString(),
  imageUrl: nullableString(),
  imageUrlKey: nullableString(),
  reminderEnabled: nullableBool(false),
  reminderMinutes: z.number().int().nullable().optional().default(null),
}).refine(
  (data) => {
    if (!data.endDate) return true
    return data.endDate.getTime() >= data.date.getTime()
  },
  { message: 'End date must be on or after start date', path: ['endDate'] }
)

export type EventInput = z.input<typeof eventSchema>
export type EventOutput = z.output<typeof eventSchema>
