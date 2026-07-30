import z from 'zod'

const nullableString = () => z.preprocess((v) => v ?? '', z.string())

export const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: nullableString(),
  type: z.enum(['home_banner', 'featured_destination', 'push_notification', 'seasonal'], {
    required_error: 'Campaign type is required',
    invalid_type_error: 'Invalid campaign type',
  }),
  bannerUrl: nullableString(),
  targetUrl: nullableString(),
  destinationId: nullableString(),
  audience: nullableString(),
  startDate: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date().optional()
  ),
  endDate: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date().optional()
  ),
  status: z.enum(['draft', 'active', 'paused', 'ended']).default('draft'),
}).superRefine((data, ctx) => {
  if (data.type === 'featured_destination' && !data.destinationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination is required for featured destination campaigns', path: ['destinationId'] })
  }
  if (data.type === 'push_notification' && !data.audience) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Audience is required for push notification campaigns', path: ['audience'] })
  }
  if (data.startDate && data.endDate && data.endDate.getTime() < data.startDate.getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be on or after start date', path: ['endDate'] })
  }
})

export type CampaignInput = z.input<typeof campaignSchema>
export type CampaignOutput = z.output<typeof campaignSchema>
