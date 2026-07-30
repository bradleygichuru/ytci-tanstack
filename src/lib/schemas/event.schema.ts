import z from 'zod'

export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().optional().default(''),
  county: z.string().min(1, 'County is required'),
  venue: z.string().optional().default(''),
  date: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date()
  ).refine((d) => !Number.isNaN(d.getTime()), 'Start date is required'),
  endDate: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date().optional()
  ),
  type: z.string().optional().default(''),
  description: z.string().optional().default(''),
  status: z.enum(['scheduled', 'postponed', 'cancelled']).default('scheduled'),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  imageUrlKey: z.string().optional().default(''),
  reminderEnabled: z.boolean().default(false),
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
