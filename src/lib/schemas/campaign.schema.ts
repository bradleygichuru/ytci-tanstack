import z from 'zod'

export const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  type: z.enum(['home_banner', 'featured_destination', 'push_notification', 'seasonal'], {
    required_error: 'Campaign type is required',
    invalid_type_error: 'Invalid campaign type',
  }),
  bannerUrl: z.string().optional().default(''),
  targetUrl: z.string().optional().default(''),
  destinationId: z.string().optional().default(''),
  audience: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  status: z.enum(['draft', 'active', 'paused', 'ended']).default('draft'),
}).superRefine((data, ctx) => {
  if (data.type === 'featured_destination' && !data.destinationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination is required for featured destination campaigns', path: ['destinationId'] })
  }
  if (data.type === 'push_notification' && !data.audience) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Audience is required for push notification campaigns', path: ['audience'] })
  }
})

export type CampaignInput = z.input<typeof campaignSchema>
export type CampaignOutput = z.output<typeof campaignSchema>
