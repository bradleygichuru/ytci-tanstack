import z from 'zod'

export const mediaAssetSchema = z.object({
  caption: z.string().optional().default(''),
  altText: z.string().optional().default(''),
  credit: z.string().optional().default(''),
  type: z.enum(['image', 'video', 'pdf', '360', 'audio']).default('image'),
  url: z.string().optional().default(''),
  rightsStatus: z.enum(['cleared', 'pending', 'restricted']).default('cleared'),
})

export type MediaAssetInput = z.input<typeof mediaAssetSchema>
export type MediaAssetOutput = z.output<typeof mediaAssetSchema>

export const moderationReportSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
})

export type ModerationReportInput = z.input<typeof moderationReportSchema>
