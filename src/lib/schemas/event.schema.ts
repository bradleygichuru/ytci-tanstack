import z from 'zod'

export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().optional().default(''),
  county: z.string().min(1, 'County is required'),
  venue: z.string().optional().default(''),
  date: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().default(''),
  type: z.string().optional().default(''),
  description: z.string().optional().default(''),
  status: z.enum(['scheduled', 'postponed', 'cancelled']).default('scheduled'),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.string().optional().default(''),
}).refine(
  (data) => {
    if (!data.endDate) return true
    return data.endDate >= data.date
  },
  { message: 'End date must be on or after start date', path: ['endDate'] }
)

export type EventInput = z.input<typeof eventSchema>
export type EventOutput = z.output<typeof eventSchema>
