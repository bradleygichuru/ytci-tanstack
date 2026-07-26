import z from 'zod'

export const conservationActivitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().min(1, 'Organizer is required'),
  location: z.string().min(1, 'Location is required'),
  locationPrivacy: z.enum(['public', 'sensitive']).default('public'),
  date: z.string().optional().default(''),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  impactMetrics: z.object({
    treesPlanted: z.number().optional().default(0),
    wasteCollected: z.number().optional().default(0),
    wildlifeSurveyed: z.number().optional().default(0),
  }).optional().default({ treesPlanted: 0, wasteCollected: 0, wildlifeSurveyed: 0 }),
  badgeName: z.string().optional().default(''),
  verificationRules: z.string().optional().default(''),
  participantCount: z.number().optional().default(0),
})

export type ConservationActivityInput = z.input<typeof conservationActivitySchema>
export type ConservationActivityOutput = z.output<typeof conservationActivitySchema>
