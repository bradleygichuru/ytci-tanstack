import z from 'zod'

export const courseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  status: z.enum(['draft', 'published']).default('draft'),
  passThreshold: z.number().min(0).max(100).optional().default(70),
  imageUrl: z.string().optional().default(''),
  badgeName: z.string().optional().default(''),
  badgeIconUrl: z.string().optional().default(''),
  certificateEnabled: z.boolean().default(false),
  certificateTemplate: z.string().optional().default('standard'),
})

export type CourseInput = z.input<typeof courseSchema>
export type CourseOutput = z.output<typeof courseSchema>
