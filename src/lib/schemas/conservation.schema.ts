import z from 'zod'

export const conservationActivitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().min(1, 'Organizer is required'),
  location: z.string().min(1, 'Location is required'),
  date: z.string().optional().default(''),
  impactMetric: z.string().optional().default(''),
  participantCount: z.number().optional().default(0),
  status: z.enum(['open', 'full', 'completed', 'cancelled']).default('open'),
})

export type ConservationActivityInput = z.input<typeof conservationActivitySchema>
export type ConservationActivityOutput = z.output<typeof conservationActivitySchema>
