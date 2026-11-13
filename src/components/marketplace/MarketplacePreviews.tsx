import { Leaf, SimCard, Star } from '@phosphor-icons/react'
import {
  ACCOMMODATION_PROPERTY_TYPE_LABELS,
  ACCOMMODATION_TIER_LABELS,
  BUSINESS_CATEGORY_LABELS,
} from '#/lib/api/marketplace'
import type {
  AccommodationPropertyType,
  AccommodationTier,
  MarketplaceCategory,
} from '#/lib/api/marketplace'

export interface BusinessPreviewData {
  name: string
  category: string
  county: string | null
  locality: string | null
  serviceArea: string | null
  tagline: string | null
  imageUrl: string | null
  imageAlt: string | null
  isFeatured: boolean
}

export interface StayPreviewData {
  name: string
  tier: string
  propertyType: string
  county: string
  locality: string | null
  priceFromKes: number | null
  priceNote: string | null
  priceCheckedAt: string | null
  distanceNote: string | null
  cancellationNote: string | null
  paymentNote: string | null
  includedNote: string | null
  badgeLabel: string | null
  imageUrl: string | null
  imageAlt: string | null
  isFeatured: boolean
}

export interface EsimPreviewData {
  name: string
  headline: string | null
  description: string
  coverageNote: string | null
  priceLabel: string | null
  redirectLabel: string | null
  disclosure: string | null
  logoUrl: string | null
  logoAlt: string | null
}

function formatKes(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount)) return null
  return `KES ${Math.round(amount).toLocaleString('en-KE')}`
}

function formatCheckedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {children}
    </div>
  )
}

function ImageFallback({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--surface-2)]">
      <Icon className="h-9 w-9 text-muted-foreground" weight="duotone" />
    </div>
  )
}

function HeroImage({
  src,
  alt,
  icon,
  isFeatured,
  topRight,
}: {
  src: string | null | undefined
  alt: string
  icon: React.ElementType
  isFeatured: boolean
  topRight?: React.ReactNode
}) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--surface-2)]">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <ImageFallback icon={icon} />
      )}
      {isFeatured ? (
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[var(--amber)] px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
          <Star className="h-2.5 w-2.5" weight="fill" /> Featured
        </span>
      ) : null}
      {topRight ? <span className="absolute right-2.5 top-2.5">{topRight}</span> : null}
    </div>
  )
}

export function BusinessCardPreview({ business }: { business: BusinessPreviewData }) {
  const location = [business.locality, business.county].filter(Boolean).join(', ')
  const category = BUSINESS_CATEGORY_LABELS[business.category as MarketplaceCategory] || 'Category not set'

  return (
    <PreviewShell>
      <HeroImage
        src={business.imageUrl}
        alt={business.imageAlt || business.name}
        icon={Leaf}
        isFeatured={business.isFeatured}
      />
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{category}</p>
        <h4 className="mt-0.5 text-sm font-bold text-foreground">{business.name || 'Business name'}</h4>
        <p className="text-[11px] text-muted-foreground">{location || business.serviceArea || 'Location not set'}</p>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {business.tagline || 'No tagline yet'}
        </p>
      </div>
    </PreviewShell>
  )
}

export function StayCardPreview({ stay }: { stay: StayPreviewData }) {
  const location = [stay.locality, stay.county].filter(Boolean).join(', ')
  const price = formatKes(stay.priceFromKes)
  const checked = formatCheckedDate(stay.priceCheckedAt)
  const facts = [stay.cancellationNote, stay.paymentNote, stay.includedNote]
    .filter((value): value is string => !!value)
    .slice(0, stay.badgeLabel ? 1 : 2)
  const tier = ACCOMMODATION_TIER_LABELS[stay.tier as AccommodationTier] ?? stay.tier
  const propertyType = ACCOMMODATION_PROPERTY_TYPE_LABELS[stay.propertyType as AccommodationPropertyType] ?? stay.propertyType

  return (
    <PreviewShell>
      <HeroImage
        src={stay.imageUrl}
        alt={stay.imageAlt || stay.name}
        icon={Leaf}
        isFeatured={stay.isFeatured}
        topRight={
          stay.badgeLabel ? (
            <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
              <Star className="h-2.5 w-2.5 shrink-0" weight="fill" /> {stay.badgeLabel}
            </span>
          ) : null
        }
      />
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {[tier, propertyType].filter(Boolean).join(' · ') || 'Tier and property type not set'}
        </p>
        <h4 className="mt-0.5 line-clamp-2 text-sm font-bold text-foreground">{stay.name || 'Stay name'}</h4>
        <p className="text-[11px] text-muted-foreground">{location || 'Location not set'}</p>
        {stay.distanceNote ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{stay.distanceNote}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {price ? (
            <span className="text-sm font-bold text-foreground">From {price}</span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">Price not set</span>
          )}
          {stay.priceNote ? (
            <span className="text-[10px] text-muted-foreground">{stay.priceNote}</span>
          ) : null}
        </div>
        {checked ? (
          <p className="text-[10px] text-muted-foreground">Checked {checked}</p>
        ) : null}

        {facts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {facts.map((fact) => (
              <span
                key={fact}
                className="max-w-full truncate rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {fact}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </PreviewShell>
  )
}

export function EsimModulePreview({ provider }: { provider: EsimPreviewData }) {
  return (
    <PreviewShell>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-2)]">
            {provider.logoUrl ? (
              <img src={provider.logoUrl} alt={provider.logoAlt || provider.name} className="h-full w-full object-contain" />
            ) : (
              <SimCard className="h-5 w-5 text-muted-foreground" weight="duotone" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{provider.name || 'Provider name'}</p>
            <h4 className="text-sm font-bold leading-tight text-foreground">{provider.headline || 'Headline not set'}</h4>
          </div>
        </div>

        <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
          {provider.description || 'Description not set'}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{provider.priceLabel || 'Price not set'}</p>
            {provider.coverageNote ? (
              <p className="line-clamp-1 text-[10px] text-muted-foreground">{provider.coverageNote}</p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white">
            {provider.redirectLabel || 'Get connected'}
          </span>
        </div>

        {provider.disclosure ? (
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">{provider.disclosure}</p>
        ) : null}
      </div>
    </PreviewShell>
  )
}
