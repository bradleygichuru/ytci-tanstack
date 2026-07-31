import z from 'zod'

export const challengeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  badgeName: z.string().min(1, 'Badge name is required'),
  rules: z.string().optional().default(''),
  badgeIconUrl: z.string().optional().default(''),
  eligibility: z.string().optional().default('').refine(
    (val) => {
      if (!val) return true
      try { JSON.parse(val); return true } catch { return false }
    },
    { message: 'Eligibility must be valid JSON' }
  ),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  status: z.enum(['draft', 'active', 'ended']).default('draft'),
})

export type ChallengeInput = z.input<typeof challengeSchema>
export type ChallengeOutput = z.output<typeof challengeSchema>
