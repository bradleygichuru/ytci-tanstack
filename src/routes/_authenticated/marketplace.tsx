import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowClockwise,
  Bed,
  Buildings,
  ChatCircle,
  CheckCircle,
  CurrencyDollar,
  Envelope,
  FloppyDisk,
  Globe,
  Image as ImageIcon,
  ListChecks,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Plus,
  SimCard,
  Star,
  Storefront,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { useApi } from '#/lib/api/use-api'
import { useCursorPagination } from '#/lib/api/use-cursor-pagination'
import { ApiErrorResponse } from '#/lib/api/types'
import type { Paginated } from '#/lib/api/types'
import {
  ACCOMMODATION_PROPERTY_TYPE_LABELS,
  ACCOMMODATION_PROPERTY_TYPES,
  ACCOMMODATION_TIER_LABELS,
  ACCOMMODATION_TIERS,
  BUSINESS_CATEGORY_LABELS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_STATUSES,
  STAY_AMENITIES,
} from '#/lib/api/marketplace'
import type {
  AccommodationProperty,
  AccommodationPropertyType,
  AccommodationTier,
  EsimProvider,
  MarketplaceStatus,
  PartnerBusiness,
} from '#/lib/api/marketplace'
import { businessSchema, esimProviderSchema, staySchema } from '#/lib/schemas/marketplace.schema'
import { FormDatePicker, FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { MediaUpload } from '#/components/shared/MediaUpload'
import type { MediaUploadResult } from '#/components/shared/MediaUpload'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { CursorPagination } from '#/components/shared/CursorPagination'
import { MarketplaceSkeleton } from '#/components/skeletons/marketplace-skeleton'
import {
  BusinessCardPreview,
  EsimModulePreview,
  StayCardPreview,
} from '#/components/marketplace/MarketplacePreviews'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

type PanelMode = 'view' | 'edit' | 'create'
type StatusFilter = 'all' | MarketplaceStatus

interface ListParams {
  cursor?: string
  q?: string
  status?: string
}

type ListLoader<T> = (params: ListParams) => Promise<Paginated<T>>

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `KES ${Math.round(value).toLocaleString('en-KE')}`
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function useDebouncedQuery(input: string): string {
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [input])
  return query
}

function useEntityList<T>(load: ListLoader<T>, query: string, statusFilter: string, errorLabel: string) {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  }, [load])
  const { cursor, hasMore, setHasMore, setCursor, handleNext, handlePrev, reset } = useCursorPagination()

  const loadList = useCallback(
    async (nextCursor?: string | null) => {
      setLoading(true)
      setError(null)
      if (!nextCursor) reset()
      try {
        const result = await loadRef.current({
          cursor: nextCursor ?? undefined,
          q: query || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        })
        setData(result.items)
        setHasMore(result.hasMore)
        setCursor(result.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to load ${errorLabel}`)
        setData((current) => current ?? [])
      } finally {
        setLoading(false)
      }
    },
    [query, statusFilter, errorLabel, reset, setHasMore, setCursor],
  )

  useEffect(() => {
    void loadList()
  }, [loadList])

  const next = useCallback(() => handleNext((value) => void loadList(value)), [handleNext, loadList])
  const prev = useCallback(() => handlePrev((value) => void loadList(value)), [handlePrev, loadList])

  return { data, loading, error, cursor, hasMore, loadList, next, prev }
}

function applyServerError(err: unknown, fallback: string, setErrors?: (update: (current: Record<string, string>) => Record<string, string>) => void): string {
  if (err instanceof ApiErrorResponse) {
    if (err.code === 'CONFLICT' && setErrors) {
      const field = err.message.toLowerCase().includes('slug') ? 'slug' : 'isFeatured'
      setErrors((current) => ({
        ...current,
        [field]: field === 'slug' ? 'This slug is already in use' : err.message,
      }))
    }
    return err.message
  }
  return fallback
}

// ── Shared shell pieces ──

function TabHeader({
  title,
  description,
  count,
  canWrite,
  onNew,
  newLabel,
}: {
  title: string
  description: string
  count: number | null
  canWrite: boolean
  onNew: () => void
  newLabel: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-sans text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground">
          {count === null ? 'Loading…' : `${count} shown`}
        </span>
        {canWrite ? (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" weight="duotone" /> {newLabel}
          </button>
        ) : (
          <span className="rounded-full border border-border bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            Read-only access
          </span>
        )}
      </div>
    </div>
  )
}

function ListToolbar({
  search,
  onSearch,
  placeholder,
  status,
  onStatus,
  extra,
}: {
  search: string
  onSearch: (value: string) => void
  placeholder: string
  status: StatusFilter
  onStatus: (value: StatusFilter) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="duotone" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-56 rounded-md border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      {(['all', ...MARKETPLACE_STATUSES] as StatusFilter[]).map((value) => (
        <button
          key={value}
          onClick={() => onStatus(value)}
          aria-pressed={status === value}
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
            status === value
              ? 'bg-primary text-white'
              : 'border border-border bg-card text-muted-foreground hover:border-[var(--outline)]'
          }`}
        >
          {value === 'all' ? 'All' : value}
        </button>
      ))}
      {extra ? <div className="ml-auto flex items-center gap-2">{extra}</div> : null}
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3" role="alert">
      <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <WarningCircle className="h-4 w-4" weight="duotone" /> {message}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-bold text-destructive"
      >
        <ArrowClockwise className="h-3.5 w-3.5" weight="bold" /> Retry
      </button>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  filtered,
}: {
  icon: React.ElementType
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  filtered?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
        <Icon className="h-6 w-6 text-muted-foreground" weight="duotone" />
      </div>
      <h3 className="mt-3 font-sans text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className={`mt-4 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
            filtered
              ? 'border border-border bg-card text-foreground'
              : 'bg-primary text-white shadow-sm'
          }`}
        >
          {filtered ? <X className="h-3.5 w-3.5" weight="bold" /> : <Plus className="h-4 w-4" weight="duotone" />}
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function RowThumb({ src, alt, icon: Icon }: { src: string | null | undefined; alt: string; icon: React.ElementType }) {
  if (src) return <img src={src} alt={alt} className="h-10 w-10 shrink-0 rounded-md object-cover" />
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
      <Icon className="h-5 w-5 text-muted-foreground" weight="duotone" />
    </div>
  )
}

function EditorPanel({
  title,
  subtitle,
  readOnly,
  onClose,
  children,
  footer,
}: {
  title: string
  subtitle: string
  readOnly: boolean
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <aside
      className="rounded-lg border border-border bg-card lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:self-start"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-sans text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {readOnly ? 'Read-only access. You can view this record but not change it.' : subtitle}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close editor"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground"
        >
          <X className="h-4 w-4" weight="bold" />
        </button>
      </div>
      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-5 py-4">{children}</div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">{footer}</div>
    </aside>
  )
}

function EditorPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <aside className="hidden min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center lg:flex" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
        <Storefront className="h-6 w-6 text-muted-foreground" weight="duotone" />
      </div>
      <h2 className="mt-3 font-sans text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    </aside>
  )
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" weight="duotone" /> {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function PreviewSection({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Mobile preview</h3>
      {note ? <p className="mb-3 text-[11px] text-muted-foreground">{note}</p> : <div className="mb-3" />}
      <div className="flex justify-center">{children}</div>
    </section>
  )
}

function FeaturedToggle({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label: string
  description: string
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-md border border-border p-3 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Star className="h-3.5 w-3.5" weight={checked ? 'fill' : 'duotone'} /> {label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function ImagePreview({
  src,
  alt,
  objectKey,
  onClear,
  canWrite,
}: {
  src: string
  alt: string
  objectKey: string
  onClear: () => void
  canWrite: boolean
}) {
  if (!src) return null
  return (
    <div className="mt-2">
      <div className="overflow-hidden rounded-lg border border-border">
        <img src={src} alt={alt} className="h-40 w-full object-cover" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-[10px] text-muted-foreground">{objectKey || 'Existing image'}</p>
        {canWrite ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[10px] font-bold text-destructive hover:underline"
          >
            Remove image
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── Form shapes ──

interface BusinessForm {
  id: string
  name: string
  slug: string
  category: string
  tagline: string
  shortDescription: string
  fullDescription: string
  county: string
  locality: string
  serviceArea: string
  address: string
  locationLat: number | null
  locationLng: number | null
  contactEmail: string
  contactPhone: string
  redirectUrl: string
  redirectLabel: string
  disclosure: string
  imageUrl: string
  imageUrlKey: string
  imageAlt: string
  imageCredit: string
  status: MarketplaceStatus
  isFeatured: boolean
  displayOrder: number
}

interface StayForm {
  id: string
  name: string
  slug: string
  tier: string
  propertyType: string
  shortDescription: string
  fullDescription: string
  county: string
  locality: string
  address: string
  locationLat: number | null
  locationLng: number | null
  priceFromKes: number | null
  priceNote: string
  priceCheckedAt: string
  distanceNote: string
  cancellationNote: string
  paymentNote: string
  includedNote: string
  badgeLabel: string
  amenities: string[]
  highlights: string[]
  bookingUrl: string
  directUrl: string
  disclosure: string
  contactEmail: string
  contactPhone: string
  imageUrl: string
  imageUrlKey: string
  imageAlt: string
  imageCredit: string
  status: MarketplaceStatus
  isFeatured: boolean
  displayOrder: number
}

interface EsimForm {
  id: string
  name: string
  slug: string
  headline: string
  description: string
  coverageNote: string
  priceLabel: string
  redirectUrl: string
  redirectLabel: string
  disclosure: string
  logoUrl: string
  logoUrlKey: string
  logoAlt: string
  status: MarketplaceStatus
  isFeatured: boolean
  displayOrder: number
}

function emptyBusiness(): BusinessForm {
  return {
    id: '', name: '', slug: '', category: '', tagline: '', shortDescription: '', fullDescription: '',
    county: '', locality: '', serviceArea: '', address: '', locationLat: null, locationLng: null,
    contactEmail: '', contactPhone: '', redirectUrl: '', redirectLabel: 'Visit partner', disclosure: '',
    imageUrl: '', imageUrlKey: '', imageAlt: '', imageCredit: '', status: 'draft', isFeatured: false, displayOrder: 0,
  }
}

function toBusinessForm(item: PartnerBusiness): BusinessForm {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    tagline: item.tagline ?? '',
    shortDescription: item.shortDescription,
    fullDescription: item.fullDescription ?? '',
    county: item.county ?? '',
    locality: item.locality ?? '',
    serviceArea: item.serviceArea ?? '',
    address: item.address ?? '',
    locationLat: item.locationLat,
    locationLng: item.locationLng,
    contactEmail: item.contactEmail ?? '',
    contactPhone: item.contactPhone ?? '',
    redirectUrl: item.redirectUrl,
    redirectLabel: item.redirectLabel ?? '',
    disclosure: item.disclosure ?? '',
    imageUrl: item.imageUrl ?? '',
    imageUrlKey: item.imageUrlKey ?? '',
    imageAlt: item.imageAlt ?? '',
    imageCredit: item.imageCredit ?? '',
    status: item.status,
    isFeatured: item.isFeatured,
    displayOrder: item.displayOrder,
  }
}

function businessPayload(form: BusinessForm): Record<string, unknown> {
  return {
    name: form.name,
    slug: form.slug,
    category: form.category,
    tagline: form.tagline,
    shortDescription: form.shortDescription,
    fullDescription: form.fullDescription,
    county: form.county,
    locality: form.locality,
    serviceArea: form.serviceArea,
    address: form.address,
    locationLat: form.locationLat,
    locationLng: form.locationLng,
    contactEmail: form.contactEmail,
    contactPhone: form.contactPhone,
    redirectUrl: form.redirectUrl,
    redirectLabel: form.redirectLabel,
    disclosure: form.disclosure,
    imageUrl: form.imageUrlKey,
    imageAlt: form.imageAlt,
    imageCredit: form.imageCredit,
    status: form.status,
    isFeatured: form.isFeatured,
    displayOrder: form.displayOrder,
  }
}

function emptyStay(): StayForm {
  return {
    id: '', name: '', slug: '', tier: '', propertyType: '', shortDescription: '', fullDescription: '',
    county: '', locality: '', address: '', locationLat: null, locationLng: null,
    priceFromKes: null, priceNote: '', priceCheckedAt: '', distanceNote: '', cancellationNote: '',
    paymentNote: '', includedNote: '', badgeLabel: '', amenities: [], highlights: [],
    bookingUrl: '', directUrl: '', disclosure: '', contactEmail: '', contactPhone: '',
    imageUrl: '', imageUrlKey: '', imageAlt: '', imageCredit: '', status: 'draft', isFeatured: false, displayOrder: 0,
  }
}

function toStayForm(item: AccommodationProperty): StayForm {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    tier: item.tier,
    propertyType: item.propertyType,
    shortDescription: item.shortDescription,
    fullDescription: item.fullDescription ?? '',
    county: item.county,
    locality: item.locality ?? '',
    address: item.address ?? '',
    locationLat: item.locationLat,
    locationLng: item.locationLng,
    priceFromKes: item.priceFromKes,
    priceNote: item.priceNote ?? '',
    priceCheckedAt: item.priceCheckedAt ?? '',
    distanceNote: item.distanceNote ?? '',
    cancellationNote: item.cancellationNote ?? '',
    paymentNote: item.paymentNote ?? '',
    includedNote: item.includedNote ?? '',
    badgeLabel: item.badgeLabel ?? '',
    amenities: item.amenities ?? [],
    highlights: item.highlights ?? [],
    bookingUrl: item.bookingUrl ?? '',
    directUrl: item.directUrl ?? '',
    disclosure: item.disclosure ?? '',
    contactEmail: item.contactEmail ?? '',
    contactPhone: item.contactPhone ?? '',
    imageUrl: item.imageUrl ?? '',
    imageUrlKey: item.imageUrlKey ?? '',
    imageAlt: item.imageAlt ?? '',
    imageCredit: item.imageCredit ?? '',
    status: item.status,
    isFeatured: item.isFeatured,
    displayOrder: item.displayOrder,
  }
}

function stayPayload(form: StayForm): Record<string, unknown> {
  return {
    name: form.name,
    slug: form.slug,
    tier: form.tier,
    propertyType: form.propertyType,
    shortDescription: form.shortDescription,
    fullDescription: form.fullDescription,
    county: form.county,
    locality: form.locality,
    address: form.address,
    locationLat: form.locationLat,
    locationLng: form.locationLng,
    priceFromKes: form.priceFromKes,
    priceNote: form.priceNote,
    priceCheckedAt: form.priceCheckedAt,
    distanceNote: form.distanceNote,
    cancellationNote: form.cancellationNote,
    paymentNote: form.paymentNote,
    includedNote: form.includedNote,
    badgeLabel: form.badgeLabel,
    amenities: form.amenities,
    highlights: form.highlights,
    bookingUrl: form.bookingUrl,
    directUrl: form.directUrl,
    disclosure: form.disclosure,
    contactEmail: form.contactEmail,
    contactPhone: form.contactPhone,
    imageUrl: form.imageUrlKey,
    imageAlt: form.imageAlt,
    imageCredit: form.imageCredit,
    status: form.status,
    isFeatured: form.isFeatured,
    displayOrder: form.displayOrder,
  }
}

function emptyEsim(): EsimForm {
  return {
    id: '', name: '', slug: '', headline: '', description: '', coverageNote: '', priceLabel: '',
    redirectUrl: '', redirectLabel: 'Get connected', disclosure: '', logoUrl: '', logoUrlKey: '', logoAlt: '',
    status: 'draft', isFeatured: false, displayOrder: 0,
  }
}

function toEsimForm(item: EsimProvider): EsimForm {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    headline: item.headline ?? '',
    description: item.description,
    coverageNote: item.coverageNote ?? '',
    priceLabel: item.priceLabel ?? '',
    redirectUrl: item.redirectUrl,
    redirectLabel: item.redirectLabel ?? '',
    disclosure: item.disclosure ?? '',
    logoUrl: item.logoUrl ?? '',
    logoUrlKey: item.logoUrlKey ?? '',
    logoAlt: item.logoAlt ?? '',
    status: item.status,
    isFeatured: item.isFeatured,
    displayOrder: item.displayOrder,
  }
}

function esimPayload(form: EsimForm): Record<string, unknown> {
  return {
    name: form.name,
    slug: form.slug,
    headline: form.headline,
    description: form.description,
    coverageNote: form.coverageNote,
    priceLabel: form.priceLabel,
    redirectUrl: form.redirectUrl,
    redirectLabel: form.redirectLabel,
    disclosure: form.disclosure,
    logoUrl: form.logoUrlKey,
    logoAlt: form.logoAlt,
    status: form.status,
    isFeatured: form.isFeatured,
    displayOrder: form.displayOrder,
  }
}

// ── Businesses tab ──

function BusinessesTab({ canWrite }: { canWrite: boolean }) {
  const api = useApi()
  const [searchInput, setSearchInput] = useState('')
  const query = useDebouncedQuery(searchInput)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { data, loading, error, cursor, hasMore, loadList, next, prev } = useEntityList<PartnerBusiness>(
    (params) => api.marketplace.businesses.list(params),
    query,
    statusFilter,
    'businesses',
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>('view')
  const [editData, setEditData] = useState<BusinessForm | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})

  const selected = data?.find((item) => item.id === selectedId) ?? null
  const firstLoad = loading && data === null
  const hasFilters = query.length > 0 || statusFilter !== 'all'

  const handleSelect = useCallback((item: PartnerBusiness) => {
    if (selectedId === item.id) {
      setSelectedId(null)
      setPanelMode('view')
      setEditData(null)
      return
    }
    setSelectedId(item.id)
    setPanelMode('edit')
    setEditData(toBusinessForm(item))
    setErrors({})
    setSlugEdited(true)
  }, [selectedId])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyBusiness())
    setErrors({})
    setSlugEdited(false)
    setMediaUrls({})
  }, [])

  const closePanel = useCallback(() => {
    setSelectedId(null)
    setPanelMode('view')
    setEditData(null)
    setErrors({})
  }, [])

  const handleField = useCallback(<K extends keyof BusinessForm>(field: K, value: BusinessForm[K]) => {
    setEditData((current) => (current ? { ...current, [field]: value } : current))
    setErrors((current) => {
      if (!current[field as string]) return current
      const nextErrors = { ...current }
      delete nextErrors[field as string]
      return nextErrors
    })
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setEditData((current) => {
      if (!current) return current
      const nextSlug = !slugEdited || !current.slug ? slugify(value) : current.slug
      return { ...current, name: value, slug: nextSlug }
    })
    setErrors((current) => {
      if (!current.name && !current.slug) return current
      const nextErrors = { ...current }
      delete nextErrors.name
      if (!slugEdited) delete nextErrors.slug
      return nextErrors
    })
  }, [slugEdited])

  const validate = useCallback((): boolean => {
    if (!editData) return false
    const result = businessSchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      toast.error('Validation failed. Check highlighted fields.')
      return false
    }
    setErrors({})
    return true
  }, [editData])

  const handleSave = useCallback(async () => {
    if (!editData || !canWrite || !validate()) return
    setSaving(true)
    try {
      if (panelMode === 'create') {
        const created = await api.marketplace.businesses.create(businessPayload(editData))
        setSelectedId(created.id)
        setPanelMode('edit')
        setEditData((current) => (current ? { ...current, id: created.id } : current))
        setSlugEdited(true)
        toast.success('Business created')
      } else if (selectedId) {
        await api.marketplace.businesses.update(selectedId, businessPayload(editData))
        toast.success('Business saved')
      }
      await loadList()
    } catch (err) {
      toast.error(applyServerError(err, 'Failed to save business', setErrors))
    } finally {
      setSaving(false)
    }
  }, [editData, canWrite, validate, panelMode, api, selectedId, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId || !canWrite) return
    setDeleting(true)
    try {
      await api.marketplace.businesses.remove(selectedId)
      toast.success('Business deleted')
      setShowDelete(false)
      closePanel()
      await loadList()
    } catch (err) {
      toast.error(applyServerError(err, 'Failed to delete business'))
    } finally {
      setDeleting(false)
    }
  }, [selectedId, canWrite, api, closePanel, loadList])

  const handleMediaComplete = useCallback((result: MediaUploadResult) => {
    setEditData((current) => (current ? { ...current, imageUrlKey: result.objectKey, imageUrl: result.url ?? current.imageUrl } : current))
    if (result.url) setMediaUrls((current) => ({ ...current, [result.objectKey]: result.url! }))
    toast.success('Hero image uploaded')
  }, [])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setStatusFilter('all')
  }, [])

  const currentImage = editData ? mediaUrls[editData.imageUrlKey] ?? editData.imageUrl : ''

  return (
    <div>
      <TabHeader
        title="Partner businesses"
        description="Experiences, food and drink, transport, shopping, services, and connectivity partners."
        count={data?.length ?? null}
        canWrite={canWrite}
        onNew={handleNew}
        newLabel="New business"
      />

      {error ? <ErrorBanner message={error} onRetry={() => void loadList()} /> : null}
      {firstLoad ? <MarketplaceSkeleton /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
          <div className={selectedId || panelMode === 'create' ? 'hidden lg:block' : 'block'}>
            <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <ListToolbar
                search={searchInput}
                onSearch={setSearchInput}
                placeholder="Search businesses..."
                status={statusFilter}
                onStatus={(value) => { setStatusFilter(value); closePanel() }}
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead>
                    <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-5 py-3">Business</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">County</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Featured</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Updated</th>
                      <th className="w-12 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {(data ?? []).map((item) => {
                      const isSelected = selectedId === item.id
                      const image = mediaUrls[item.imageUrlKey ?? ''] ?? item.imageUrl
                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <RowThumb src={image} alt={item.imageAlt || item.name} icon={Buildings} />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-foreground">{item.name}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{item.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {BUSINESS_CATEGORY_LABELS[item.category] ?? item.category}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{item.county || item.serviceArea || '—'}</td>
                          <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                          <td className="px-5 py-3">
                            {item.isFeatured ? <Star className="h-4 w-4 text-[var(--amber-deep)]" weight="fill" /> : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{item.displayOrder}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(item.updatedAt)}</td>
                          <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                        </tr>
                      )
                    })}
                    {data?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-0">
                          {hasFilters ? (
                            <EmptyState
                              icon={MagnifyingGlass}
                              title="No businesses match these filters"
                              description="Try a different search term or clear the status filter."
                              actionLabel="Clear filters"
                              onAction={clearFilters}
                              filtered
                            />
                          ) : (
                            <EmptyState
                              icon={Buildings}
                              title="No businesses yet"
                              description="Add a partner business to start building the mobile marketplace."
                              actionLabel={canWrite ? 'Add the first business' : undefined}
                              onAction={canWrite ? handleNew : undefined}
                            />
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <CursorPagination nextCursor={cursor} hasMore={hasMore} onNext={next} onPrev={prev} loading={loading} />
            </div>
          </div>

          <div className={selectedId || panelMode === 'create' ? 'block' : 'hidden lg:block'}>
            {panelMode === 'view' || !editData ? (
              <EditorPlaceholder
                title="Select a business"
                description="Choose a row to edit it, or add a new partner business."
              />
            ) : (
              <EditorPanel
                title={panelMode === 'create' ? 'New business' : editData.name || 'Untitled business'}
                subtitle="Draft and publish this card for the mobile marketplace."
                readOnly={!canWrite}
                onClose={closePanel}
                footer={
                  canWrite ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                      >
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        {panelMode === 'create' ? 'Create business' : 'Save changes'}
                      </button>
                      {panelMode === 'edit' ? (
                        <button
                          onClick={() => setShowDelete(true)}
                          className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" weight="duotone" /> Delete
                        </button>
                      ) : null}
                      <button
                        onClick={closePanel}
                        className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]"
                      >
                        <X className="h-4 w-4" weight="duotone" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={closePanel}
                      className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]"
                    >
                      <X className="h-4 w-4" weight="duotone" /> Close
                    </button>
                  )
                }
              >
                <fieldset disabled={!canWrite} className="min-w-0 space-y-4">
                  <FormSection title="Identity" icon={Buildings}>
                    <FormInput label="Name" required value={editData.name} onChange={handleNameChange} error={errors.name} />
                    <FormInput
                      label="Slug"
                      required
                      value={editData.slug}
                      onChange={(value) => { setSlugEdited(true); handleField('slug', value) }}
                      error={errors.slug}
                      description="Lowercase letters, numbers, and hyphens. Generated from the name until you edit it."
                    />
                    <FormSelect
                      label="Category"
                      required
                      value={editData.category}
                      options={MARKETPLACE_CATEGORIES.map((value) => ({ value, label: BUSINESS_CATEGORY_LABELS[value] }))}
                      onChange={(value) => handleField('category', value)}
                      error={errors.category}
                    />
                    <FormInput label="Tagline" value={editData.tagline} onChange={(value) => handleField('tagline', value)} error={errors.tagline} description="Up to 120 characters. Shown on the mobile card." />
                    <FormTextarea
                      label="Short description"
                      required
                      value={editData.shortDescription}
                      onChange={(value) => handleField('shortDescription', value)}
                      error={errors.shortDescription}
                      description={`${editData.shortDescription.length}/240 characters`}
                    />
                    <FormTextarea label="Full description" value={editData.fullDescription} onChange={(value) => handleField('fullDescription', value)} error={errors.fullDescription} />
                  </FormSection>

                  <FormSection title="Place" icon={MapPin}>
                    <FormInput label="County" value={editData.county} onChange={(value) => handleField('county', value)} error={errors.county} description="Leave empty for an online-only service." />
                    <FormInput label="Locality" value={editData.locality} onChange={(value) => handleField('locality', value)} error={errors.locality} />
                    <FormInput label="Service area" value={editData.serviceArea} onChange={(value) => handleField('serviceArea', value)} error={errors.serviceArea} />
                    <FormInput label="Address" value={editData.address} onChange={(value) => handleField('address', value)} error={errors.address} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="Latitude"
                        type="number"
                        value={editData.locationLat == null ? '' : String(editData.locationLat)}
                        onChange={(value) => { const parsed = Number(value); handleField('locationLat', value === '' || Number.isNaN(parsed) ? null : parsed) }}
                        error={errors.locationLat}
                      />
                      <FormInput
                        label="Longitude"
                        type="number"
                        value={editData.locationLng == null ? '' : String(editData.locationLng)}
                        onChange={(value) => { const parsed = Number(value); handleField('locationLng', value === '' || Number.isNaN(parsed) ? null : parsed) }}
                        error={errors.locationLng}
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Contact" icon={Envelope}>
                    <FormInput label="Contact email" type="email" value={editData.contactEmail} onChange={(value) => handleField('contactEmail', value)} error={errors.contactEmail} />
                    <FormInput label="Contact phone" value={editData.contactPhone} onChange={(value) => handleField('contactPhone', value)} error={errors.contactPhone} />
                  </FormSection>

                  <FormSection title="Handoff" icon={Globe}>
                    <FormInput label="Redirect URL" required value={editData.redirectUrl} onChange={(value) => handleField('redirectUrl', value)} error={errors.redirectUrl} description="Opens in the system browser. http(s) only." />
                    <FormInput label="Redirect label" value={editData.redirectLabel} onChange={(value) => handleField('redirectLabel', value)} error={errors.redirectLabel} />
                    <FormTextarea label="Disclosure" value={editData.disclosure} onChange={(value) => handleField('disclosure', value)} error={errors.disclosure} description="Shown next to the link in the app." />
                  </FormSection>

                  <FormSection title="Media" icon={ImageIcon}>
                    {canWrite ? (
                      <MediaUpload label="Upload hero image" allowedTypes={IMAGE_TYPES} onComplete={handleMediaComplete} onError={(message) => toast.error(message)} />
                    ) : null}
                    <ImagePreview
                      src={currentImage}
                      alt={editData.imageAlt || editData.name}
                      objectKey={editData.imageUrlKey}
                      canWrite={canWrite}
                      onClear={() => setEditData((current) => (current ? { ...current, imageUrl: '', imageUrlKey: '' } : current))}
                    />
                    <FormInput label="Image alt text" value={editData.imageAlt} onChange={(value) => handleField('imageAlt', value)} error={errors.imageAlt} />
                    <FormInput label="Image credit" value={editData.imageCredit} onChange={(value) => handleField('imageCredit', value)} error={errors.imageCredit} />
                  </FormSection>

                  <FormSection title="Publishing" icon={Star}>
                    <FormSelect
                      label="Status"
                      value={editData.status}
                      options={MARKETPLACE_STATUSES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
                      onChange={(value) => handleField('status', value as MarketplaceStatus)}
                      error={errors.status}
                    />
                    <FeaturedToggle
                      checked={editData.isFeatured}
                      onChange={(value) => handleField('isFeatured', value)}
                      label="Feature in the marketplace"
                      description="Featured records sort ahead of the rest. Only published records appear in the mobile app."
                    />
                    <FormInput
                      label="Display order"
                      type="number"
                      value={String(editData.displayOrder)}
                      onChange={(value) => { const parsed = Number(value); handleField('displayOrder', value === '' || Number.isNaN(parsed) ? 0 : parsed) }}
                      error={errors.displayOrder}
                      description="0–10000. Lower numbers appear first."
                    />
                    <p className="text-[11px] text-muted-foreground">Only published records are returned by the public marketplace endpoints.</p>
                  </FormSection>

                  <PreviewSection note="This is the card anatomy used on the mobile marketplace hub. No ratings or prices are invented.">
                    <BusinessCardPreview business={editData} />
                  </PreviewSection>
                </fieldset>
              </EditorPanel>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete business"
        description={`Delete "${selected?.name ?? editData?.name ?? 'this business'}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

// ── Stays tab ──

function TagInput({
  values,
  onChange,
  placeholder,
  max,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  max: number
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value) return
    if (values.includes(value)) {
      setDraft('')
      return
    }
    if (values.length >= max) {
      toast.error(`Add at most ${max} highlights`)
      return
    }
    onChange([...values, value])
    setDraft('')
  }

  return (
    <div>
      {values.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-foreground">
              {value}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" weight="bold" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button type="button" onClick={add} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-[var(--surface-2)]">
          Add
        </button>
      </div>
    </div>
  )
}

function AmenitiesPicker({ selected, onChange }: { selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAY_AMENITIES.map((amenity) => {
        const active = selected.includes(amenity)
        return (
          <button
            key={amenity}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? selected.filter((item) => item !== amenity) : [...selected, amenity])}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              active
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-card text-muted-foreground hover:border-[var(--outline)]'
            }`}
          >
            {amenity}
          </button>
        )
      })}
    </div>
  )
}

function StaysTab({ canWrite }: { canWrite: boolean }) {
  const api = useApi()
  const [searchInput, setSearchInput] = useState('')
  const query = useDebouncedQuery(searchInput)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { data, loading, error, cursor, hasMore, loadList, next, prev } = useEntityList<AccommodationProperty>(
    (params) => api.marketplace.stays.list(params),
    query,
    statusFilter,
    'stays',
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>('view')
  const [editData, setEditData] = useState<StayForm | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})

  const selected = data?.find((item) => item.id === selectedId) ?? null
  const firstLoad = loading && data === null
  const hasFilters = query.length > 0 || statusFilter !== 'all'

  const handleSelect = useCallback((item: AccommodationProperty) => {
    if (selectedId === item.id) {
      setSelectedId(null)
      setPanelMode('view')
      setEditData(null)
      return
    }
    setSelectedId(item.id)
    setPanelMode('edit')
    setEditData(toStayForm(item))
    setErrors({})
    setSlugEdited(true)
  }, [selectedId])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyStay())
    setErrors({})
    setSlugEdited(false)
    setMediaUrls({})
  }, [])

  const closePanel = useCallback(() => {
    setSelectedId(null)
    setPanelMode('view')
    setEditData(null)
    setErrors({})
  }, [])

  const handleField = useCallback(<K extends keyof StayForm>(field: K, value: StayForm[K]) => {
    setEditData((current) => (current ? { ...current, [field]: value } : current))
    setErrors((current) => {
      if (!current[field as string]) return current
      const nextErrors = { ...current }
      delete nextErrors[field as string]
      return nextErrors
    })
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setEditData((current) => {
      if (!current) return current
      const nextSlug = !slugEdited || !current.slug ? slugify(value) : current.slug
      return { ...current, name: value, slug: nextSlug }
    })
    setErrors((current) => {
      if (!current.name && !current.slug) return current
      const nextErrors = { ...current }
      delete nextErrors.name
      if (!slugEdited) delete nextErrors.slug
      return nextErrors
    })
  }, [slugEdited])

  const validate = useCallback((): boolean => {
    if (!editData) return false
    const result = staySchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      toast.error('Validation failed. Check highlighted fields.')
      return false
    }
    setErrors({})
    return true
  }, [editData])

  const handleSave = useCallback(async () => {
    if (!editData || !canWrite || !validate()) return
    setSaving(true)
    try {
      if (panelMode === 'create') {
        const created = await api.marketplace.stays.create(stayPayload(editData))
        setSelectedId(created.id)
        setPanelMode('edit')
        setEditData((current) => (current ? { ...current, id: created.id } : current))
        setSlugEdited(true)
        toast.success('Stay created')
      } else if (selectedId) {
        await api.marketplace.stays.update(selectedId, stayPayload(editData))
        toast.success('Stay saved')
      }
      await loadList()
    } catch (err) {
      toast.error(applyServerError(err, 'Failed to save stay', setErrors))
    } finally {
      setSaving(false)
    }
  }, [editData, canWrite, validate, panelMode, api, selectedId, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId || !canWrite) return
    setDeleting(true)
    try {
      await api.marketplace.stays.remove(selectedId)
      toast.success('Stay deleted')
      setShowDelete(false)
      closePanel()
      await loadList()
    } catch (err) {
      toast.error(applyServerError(err, 'Failed to delete stay'))
    } finally {
      setDeleting(false)
    }
  }, [selectedId, canWrite, api, closePanel, loadList])

  const handleMediaComplete = useCallback((result: MediaUploadResult) => {
    setEditData((current) => (current ? { ...current, imageUrlKey: result.objectKey, imageUrl: result.url ?? current.imageUrl } : current))
    if (result.url) setMediaUrls((current) => ({ ...current, [result.objectKey]: result.url! }))
    toast.success('Hero image uploaded')
  }, [])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setStatusFilter('all')
  }, [])

  const currentImage = editData ? mediaUrls[editData.imageUrlKey] ?? editData.imageUrl : ''

  return (
    <div>
      <TabHeader
        title="Stays"
        description="Accommodation cards with indicative pricing, trust facts, and booking handoff."
        count={data?.length ?? null}
        canWrite={canWrite}
        onNew={handleNew}
        newLabel="New stay"
      />

      {error ? <ErrorBanner message={error} onRetry={() => void loadList()} /> : null}
      {firstLoad ? <MarketplaceSkeleton /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
          <div className={selectedId || panelMode === 'create' ? 'hidden lg:block' : 'block'}>
            <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <ListToolbar
                search={searchInput}
                onSearch={setSearchInput}
                placeholder="Search stays..."
                status={statusFilter}
                onStatus={(value) => { setStatusFilter(value); closePanel() }}
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-5 py-3">Stay</th>
                      <th className="px-5 py-3">Tier</th>
                      <th className="px-5 py-3">County</th>
                      <th className="px-5 py-3">From</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Featured</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Updated</th>
                      <th className="w-12 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {(data ?? []).map((item) => {
                      const isSelected = selectedId === item.id
                      const image = mediaUrls[item.imageUrlKey ?? ''] ?? item.imageUrl
                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <RowThumb src={image} alt={item.imageAlt || item.name} icon={Bed} />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-foreground">{item.name}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{item.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {ACCOMMODATION_TIER_LABELS[item.tier] ?? item.tier}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{item.county || '—'}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{formatCount(item.priceFromKes)}</td>
                          <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                          <td className="px-5 py-3">
                            {item.isFeatured ? <Star className="h-4 w-4 text-[var(--amber-deep)]" weight="fill" /> : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{item.displayOrder}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(item.updatedAt)}</td>
                          <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                        </tr>
                      )
                    })}
                    {data?.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-0">
                          {hasFilters ? (
                            <EmptyState
                              icon={MagnifyingGlass}
                              title="No stays match these filters"
                              description="Try a different search term or clear the status filter."
                              actionLabel="Clear filters"
                              onAction={clearFilters}
                              filtered
                            />
                          ) : (
                            <EmptyState
                              icon={Bed}
                              title="No stays yet"
                              description="Add an accommodation property to start building the stays surface."
                              actionLabel={canWrite ? 'Add the first stay' : undefined}
                              onAction={canWrite ? handleNew : undefined}
                            />
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <CursorPagination nextCursor={cursor} hasMore={hasMore} onNext={next} onPrev={prev} loading={loading} />
            </div>
          </div>

          <div className={selectedId || panelMode === 'create' ? 'block' : 'hidden lg:block'}>
            {panelMode === 'view' || !editData ? (
              <EditorPlaceholder
                title="Select a stay"
                description="Choose a row to edit it, or add a new accommodation property."
              />
            ) : (
              <EditorPanel
                title={panelMode === 'create' ? 'New stay' : editData.name || 'Untitled stay'}
                subtitle="Indicative pricing and trust facts, exactly as they will appear in the app."
                readOnly={!canWrite}
                onClose={closePanel}
                footer={
                  canWrite ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                      >
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        {panelMode === 'create' ? 'Create stay' : 'Save changes'}
                      </button>
                      {panelMode === 'edit' ? (
                        <button
                          onClick={() => setShowDelete(true)}
                          className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" weight="duotone" /> Delete
                        </button>
                      ) : null}
                      <button
                        onClick={closePanel}
                        className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]"
                      >
                        <X className="h-4 w-4" weight="duotone" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={closePanel}
                      className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]"
                    >
                      <X className="h-4 w-4" weight="duotone" /> Close
                    </button>
                  )
                }
              >
                <fieldset disabled={!canWrite} className="min-w-0 space-y-4">
                  <FormSection title="Identity" icon={Bed}>
                    <FormInput label="Name" required value={editData.name} onChange={handleNameChange} error={errors.name} />
                    <FormInput
                      label="Slug"
                      required
                      value={editData.slug}
                      onChange={(value) => { setSlugEdited(true); handleField('slug', value) }}
                      error={errors.slug}
                      description="Lowercase letters, numbers, and hyphens."
                    />
                    <FormSelect
                      label="Tier"
                      required
                      value={editData.tier}
                      options={ACCOMMODATION_TIERS.map((value) => ({ value, label: ACCOMMODATION_TIER_LABELS[value] }))}
                      onChange={(value) => handleField('tier', value as AccommodationTier)}
                      error={errors.tier}
                    />
                    <FormSelect
                      label="Property type"
                      required
                      value={editData.propertyType}
                      options={ACCOMMODATION_PROPERTY_TYPES.map((value) => ({ value, label: ACCOMMODATION_PROPERTY_TYPE_LABELS[value] }))}
                      onChange={(value) => handleField('propertyType', value as AccommodationPropertyType)}
                      error={errors.propertyType}
                    />
                    <FormTextarea
                      label="Short description"
                      required
                      value={editData.shortDescription}
                      onChange={(value) => handleField('shortDescription', value)}
                      error={errors.shortDescription}
                      description={`${editData.shortDescription.length}/240 characters`}
                    />
                    <FormTextarea label="Full description" value={editData.fullDescription} onChange={(value) => handleField('fullDescription', value)} error={errors.fullDescription} />
                  </FormSection>

                  <FormSection title="Place" icon={MapPin}>
                    <FormInput label="County" required value={editData.county} onChange={(value) => handleField('county', value)} error={errors.county} />
                    <FormInput label="Locality" value={editData.locality} onChange={(value) => handleField('locality', value)} error={errors.locality} />
                    <FormInput label="Address" value={editData.address} onChange={(value) => handleField('address', value)} error={errors.address} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="Latitude"
                        type="number"
                        value={editData.locationLat == null ? '' : String(editData.locationLat)}
                        onChange={(value) => { const parsed = Number(value); handleField('locationLat', value === '' || Number.isNaN(parsed) ? null : parsed) }}
                        error={errors.locationLat}
                      />
                      <FormInput
                        label="Longitude"
                        type="number"
                        value={editData.locationLng == null ? '' : String(editData.locationLng)}
                        onChange={(value) => { const parsed = Number(value); handleField('locationLng', value === '' || Number.isNaN(parsed) ? null : parsed) }}
                        error={errors.locationLng}
                      />
                    </div>
                    <FormInput label="Distance note" value={editData.distanceNote} onChange={(value) => handleField('distanceNote', value)} error={errors.distanceNote} description="e.g. 10 min to the gate." />
                  </FormSection>

                  <FormSection title="Price" icon={CurrencyDollar}>
                    <FormInput
                      label="Price from (KES)"
                      type="number"
                      value={editData.priceFromKes == null ? '' : String(editData.priceFromKes)}
                      onChange={(value) => { const parsed = Number(value); handleField('priceFromKes', value === '' || Number.isNaN(parsed) ? null : parsed) }}
                      error={errors.priceFromKes}
                      description="Indicative only. Leave empty to show no price."
                    />
                    <FormInput label="Price note" value={editData.priceNote} onChange={(value) => handleField('priceNote', value)} error={errors.priceNote} description="e.g. per night, low season." />
                    <FormDatePicker label="Price checked on" value={editData.priceCheckedAt} onChange={(value) => handleField('priceCheckedAt', value)} error={errors.priceCheckedAt} />
                  </FormSection>

                  <FormSection title="Trust facts" icon={CheckCircle}>
                    <FormInput label="Cancellation note" value={editData.cancellationNote} onChange={(value) => handleField('cancellationNote', value)} error={errors.cancellationNote} description="Plain-language cancellation window." />
                    <FormInput label="Payment note" value={editData.paymentNote} onChange={(value) => handleField('paymentNote', value)} error={errors.paymentNote} description="e.g. Pay at stay or M-PESA." />
                    <FormInput label="Included note" value={editData.includedNote} onChange={(value) => handleField('includedNote', value)} error={errors.includedNote} description="What the indicative price includes." />
                    <FormInput label="Badge label" value={editData.badgeLabel} onChange={(value) => handleField('badgeLabel', value)} error={errors.badgeLabel} description="One verified label, shown only when set." />
                  </FormSection>

                  <FormSection title="Experience" icon={ListChecks}>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-foreground">Amenities</p>
                      <AmenitiesPicker selected={editData.amenities} onChange={(values) => handleField('amenities', values)} />
                      {errors.amenities ? <p className="mt-1 text-xs text-destructive">{errors.amenities}</p> : null}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-foreground">Highlights</p>
                      <TagInput
                        values={editData.highlights}
                        onChange={(values) => handleField('highlights', values)}
                        placeholder="Add a highlight and press Enter"
                        max={6}
                      />
                      {errors.highlights ? <p className="mt-1 text-xs text-destructive">{errors.highlights}</p> : null}
                    </div>
                    {canWrite ? (
                      <MediaUpload label="Upload hero image" allowedTypes={IMAGE_TYPES} onComplete={handleMediaComplete} onError={(message) => toast.error(message)} />
                    ) : null}
                    <ImagePreview
                      src={currentImage}
                      alt={editData.imageAlt || editData.name}
                      objectKey={editData.imageUrlKey}
                      canWrite={canWrite}
                      onClear={() => setEditData((current) => (current ? { ...current, imageUrl: '', imageUrlKey: '' } : current))}
                    />
                    <FormInput label="Image alt text" value={editData.imageAlt} onChange={(value) => handleField('imageAlt', value)} error={errors.imageAlt} />
                    <FormInput label="Image credit" value={editData.imageCredit} onChange={(value) => handleField('imageCredit', value)} error={errors.imageCredit} />
                  </FormSection>

                  <FormSection title="Handoff" icon={Globe}>
                    <FormInput label="Booking URL" value={editData.bookingUrl} onChange={(value) => handleField('bookingUrl', value)} error={errors.bookingUrl} description="Required for a published stay if there is no direct URL." />
                    <FormInput label="Direct URL" value={editData.directUrl} onChange={(value) => handleField('directUrl', value)} error={errors.directUrl} description="Used when the property has no booking link." />
                    <FormTextarea label="Disclosure" value={editData.disclosure} onChange={(value) => handleField('disclosure', value)} error={errors.disclosure} />
                    <FormInput label="Contact email" type="email" value={editData.contactEmail} onChange={(value) => handleField('contactEmail', value)} error={errors.contactEmail} />
                    <FormInput label="Contact phone" value={editData.contactPhone} onChange={(value) => handleField('contactPhone', value)} error={errors.contactPhone} />
                  </FormSection>

                  <FormSection title="Publishing" icon={Star}>
                    <FormSelect
                      label="Status"
                      value={editData.status}
                      options={MARKETPLACE_STATUSES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
                      onChange={(value) => handleField('status', value as MarketplaceStatus)}
                      error={errors.status}
                    />
                    <FeaturedToggle
                      checked={editData.isFeatured}
                      onChange={(value) => handleField('isFeatured', value)}
                      label="Feature this stay"
                      description="Featured stays sort ahead of the rest. Only published stays appear in the app."
                    />
                    <FormInput
                      label="Display order"
                      type="number"
                      value={String(editData.displayOrder)}
                      onChange={(value) => { const parsed = Number(value); handleField('displayOrder', value === '' || Number.isNaN(parsed) ? 0 : parsed) }}
                      error={errors.displayOrder}
                      description="0–10000. Lower numbers appear first."
                    />
                    <p className="text-[11px] text-muted-foreground">A published stay needs at least one of booking URL or direct URL.</p>
                  </FormSection>

                  <PreviewSection note="This is the stay card anatomy used in the mobile app. Tier stays a secondary label.">
                    <StayCardPreview stay={editData} />
                  </PreviewSection>
                </fieldset>
              </EditorPanel>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete stay"
        description={`Delete "${selected?.name ?? editData?.name ?? 'this stay'}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

// ── eSIM tab ──

function EsimTab({ canWrite }: { canWrite: boolean }) {
  const api = useApi()
  const [searchInput, setSearchInput] = useState('')
  const query = useDebouncedQuery(searchInput)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { data, loading, error, cursor, hasMore, loadList, next, prev } = useEntityList<EsimProvider>(
    (params) => api.marketplace.esim.list(params),
    query,
    statusFilter,
    'eSIM providers',
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>('view')
  const [editData, setEditData] = useState<EsimForm | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})

  const selected = data?.find((item) => item.id === selectedId) ?? null
  const firstLoad = loading && data === null
  const hasFilters = query.length > 0 || statusFilter !== 'all'
  // The admin eSIM endpoint has no `q` parameter, so filter the loaded page locally.
  const visibleData = query
    ? (data ?? []).filter((item) => {
        const haystack = [item.name, item.slug, item.headline, item.priceLabel].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(query.toLowerCase())
      })
    : (data ?? [])

  const handleSelect = useCallback((item: EsimProvider) => {
    if (selectedId === item.id) {
      setSelectedId(null)
      setPanelMode('view')
      setEditData(null)
      return
    }
    setSelectedId(item.id)
    setPanelMode('edit')
    setEditData(toEsimForm(item))
    setErrors({})
    setSlugEdited(true)
  }, [selectedId])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyEsim())
    setErrors({})
    setSlugEdited(false)
    setMediaUrls({})
  }, [])

  const closePanel = useCallback(() => {
    setSelectedId(null)
    setPanelMode('view')
    setEditData(null)
    setErrors({})
  }, [])

  const handleField = useCallback(<K extends keyof EsimForm>(field: K, value: EsimForm[K]) => {
    setEditData((current) => (current ? { ...current, [field]: value } : current))
    setErrors((current) => {
      if (!current[field as string]) return current
      const nextErrors = { ...current }
      delete nextErrors[field as string]
      return nextErrors
    })
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setEditData((current) => {
      if (!current) return current
      const nextSlug = !slugEdited || !current.slug ? slugify(value) : current.slug
      return { ...current, name: value, slug: nextSlug }
    })
    setErrors((current) => {
      if (!current.name && !current.slug) return current
      const nextErrors = { ...current }
      delete nextErrors.name
      if (!slugEdited) delete nextErrors.slug
      return nextErrors
    })
  }, [slugEdited])

  const validate = useCallback((): boolean => {
    if (!editData) return false
    const result = esimProviderSchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      toast.error('Validation failed. Check highlighted fields.')
      return false
    }
    setErrors({})
    return true
  }, [editData])

  const handleSave = useCallback(async () => {
    if (!editData || !canWrite || !validate()) return
    setSaving(true)
    try {
      if (panelMode === 'create') {
        const created = await api.marketplace.esim.create(esimPayload(editData))
        setSelectedId(created.id)
        setPanelMode('edit')
        setEditData((current) => (current ? { ...current, id: created.id } : current))
        setSlugEdited(true)
        toast.success('eSIM provider created')
      } else if (selectedId) {
        await api.marketplace.esim.update(selectedId, esimPayload(editData))
        toast.success('eSIM provider saved')
      }
      await loadList()
    } catch (err) {
      toast.error(applyServerError(err, 'Failed to save eSIM provider', setErrors))
    } finally {
      setSaving(false)
    }
  }, [editData, canWrite, validate, panelMode, api, selectedId, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId || !canWrite) return
    setDeleting(true)
    try {
      await api.marketplace.esim.remove(selectedId)
      toast.success('eSIM provider deleted')
      setShowDelete(false)
      closePanel()
      await loadList()
    } catch (err) {
      toast.error(applyServerError(err, 'Failed to delete eSIM provider'))
    } finally {
      setDeleting(false)
    }
  }, [selectedId, canWrite, api, closePanel, loadList])

  const handleLogoComplete = useCallback((result: MediaUploadResult) => {
    setEditData((current) => (current ? { ...current, logoUrlKey: result.objectKey, logoUrl: result.url ?? current.logoUrl } : current))
    if (result.url) setMediaUrls((current) => ({ ...current, [result.objectKey]: result.url! }))
    toast.success('Logo uploaded')
  }, [])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setStatusFilter('all')
  }, [])

  const currentLogo = editData ? mediaUrls[editData.logoUrlKey] ?? editData.logoUrl : ''

  return (
    <div>
      <TabHeader
        title="eSIM providers"
        description="One featured published provider appears in the mobile eSIM module. Other rows are kept for future comparison."
        count={data === null ? null : visibleData.length}
        canWrite={canWrite}
        onNew={handleNew}
        newLabel="New provider"
      />

      {error ? <ErrorBanner message={error} onRetry={() => void loadList()} /> : null}
      {firstLoad ? <MarketplaceSkeleton /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
          <div className={selectedId || panelMode === 'create' ? 'hidden lg:block' : 'block'}>
            <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <ListToolbar
                search={searchInput}
                onSearch={setSearchInput}
                placeholder="Search providers..."
                status={statusFilter}
                onStatus={(value) => { setStatusFilter(value); closePanel() }}
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-5 py-3">Provider</th>
                      <th className="px-5 py-3">Price label</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Featured</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Updated</th>
                      <th className="w-12 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleData.map((item) => {
                      const isSelected = selectedId === item.id
                      const logo = mediaUrls[item.logoUrlKey ?? ''] ?? item.logoUrl
                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <RowThumb src={logo} alt={item.logoAlt || item.name} icon={SimCard} />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-foreground">{item.name}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{item.headline || item.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{item.priceLabel || '—'}</td>
                          <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                          <td className="px-5 py-3">
                            {item.isFeatured ? <Star className="h-4 w-4 text-[var(--amber-deep)]" weight="fill" /> : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{item.displayOrder}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(item.updatedAt)}</td>
                          <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                        </tr>
                      )
                    })}
                    {visibleData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          {hasFilters ? (
                            <EmptyState
                              icon={MagnifyingGlass}
                              title="No providers match these filters"
                              description="Try a different search term or clear the status filter."
                              actionLabel="Clear filters"
                              onAction={clearFilters}
                              filtered
                            />
                          ) : (
                            <EmptyState
                              icon={SimCard}
                              title="No eSIM providers yet"
                              description="Add a provider and feature one published row for the mobile eSIM module."
                              actionLabel={canWrite ? 'Add the first provider' : undefined}
                              onAction={canWrite ? handleNew : undefined}
                            />
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <CursorPagination nextCursor={cursor} hasMore={hasMore} onNext={next} onPrev={prev} loading={loading} />
            </div>
          </div>

          <div className={selectedId || panelMode === 'create' ? 'block' : 'hidden lg:block'}>
            {panelMode === 'view' || !editData ? (
              <EditorPlaceholder
                title="Select a provider"
                description="Choose a row to edit it, or add a new eSIM provider."
              />
            ) : (
              <EditorPanel
                title={panelMode === 'create' ? 'New provider' : editData.name || 'Untitled provider'}
                subtitle="The featured published provider is the one the mobile app shows."
                readOnly={!canWrite}
                onClose={closePanel}
                footer={
                  canWrite ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                      >
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        {panelMode === 'create' ? 'Create provider' : 'Save changes'}
                      </button>
                      {panelMode === 'edit' ? (
                        <button
                          onClick={() => setShowDelete(true)}
                          className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" weight="duotone" /> Delete
                        </button>
                      ) : null}
                      <button
                        onClick={closePanel}
                        className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]"
                      >
                        <X className="h-4 w-4" weight="duotone" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={closePanel}
                      className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]"
                    >
                      <X className="h-4 w-4" weight="duotone" /> Close
                    </button>
                  )
                }
              >
                <fieldset disabled={!canWrite} className="min-w-0 space-y-4">
                  <FormSection title="Provider" icon={SimCard}>
                    <FormInput label="Name" required value={editData.name} onChange={handleNameChange} error={errors.name} />
                    <FormInput
                      label="Slug"
                      required
                      value={editData.slug}
                      onChange={(value) => { setSlugEdited(true); handleField('slug', value) }}
                      error={errors.slug}
                      description="Lowercase letters, numbers, and hyphens."
                    />
                    {canWrite ? (
                      <MediaUpload label="Upload logo" allowedTypes={IMAGE_TYPES} onComplete={handleLogoComplete} onError={(message) => toast.error(message)} />
                    ) : null}
                    <ImagePreview
                      src={currentLogo}
                      alt={editData.logoAlt || editData.name}
                      objectKey={editData.logoUrlKey}
                      canWrite={canWrite}
                      onClear={() => setEditData((current) => (current ? { ...current, logoUrl: '', logoUrlKey: '' } : current))}
                    />
                    <FormInput label="Logo alt text" value={editData.logoAlt} onChange={(value) => handleField('logoAlt', value)} error={errors.logoAlt} />
                  </FormSection>

                  <FormSection title="Message" icon={ChatCircle}>
                    <FormInput label="Headline" value={editData.headline} onChange={(value) => handleField('headline', value)} error={errors.headline} description="One short line. Up to 120 characters." />
                    <FormTextarea
                      label="Description"
                      required
                      value={editData.description}
                      onChange={(value) => handleField('description', value)}
                      error={errors.description}
                      description={`${editData.description.length}/400 characters`}
                    />
                    <FormInput label="Coverage note" value={editData.coverageNote} onChange={(value) => handleField('coverageNote', value)} error={errors.coverageNote} />
                    <FormInput label="Price label" value={editData.priceLabel} onChange={(value) => handleField('priceLabel', value)} error={errors.priceLabel} description="Free text, e.g. From $4.50." />
                  </FormSection>

                  <FormSection title="Handoff" icon={Globe}>
                    <FormInput label="Redirect URL" required value={editData.redirectUrl} onChange={(value) => handleField('redirectUrl', value)} error={errors.redirectUrl} description="Opens in the system browser. http(s) only." />
                    <FormInput label="Redirect label" value={editData.redirectLabel} onChange={(value) => handleField('redirectLabel', value)} error={errors.redirectLabel} />
                    <FormTextarea label="Disclosure" value={editData.disclosure} onChange={(value) => handleField('disclosure', value)} error={errors.disclosure} description="Shown under the CTA when an affiliate or tracked link is used." />
                  </FormSection>

                  <FormSection title="Publishing" icon={Star}>
                    <FormSelect
                      label="Status"
                      value={editData.status}
                      options={MARKETPLACE_STATUSES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
                      onChange={(value) => {
                        handleField('status', value as MarketplaceStatus)
                        if (value !== 'published' && editData.isFeatured) handleField('isFeatured', false)
                      }}
                      error={errors.status}
                    />
                    <FeaturedToggle
                      checked={editData.isFeatured}
                      onChange={(value) => handleField('isFeatured', value)}
                      disabled={editData.status !== 'published' || !canWrite}
                      label="Feature this provider"
                      description={
                        editData.status === 'published'
                          ? 'Featuring this provider removes the featured flag from the previous one in the same save.'
                          : 'Publish this provider before featuring it.'
                      }
                    />
                    {errors.isFeatured ? <p className="text-xs text-destructive">{errors.isFeatured}</p> : null}
                    <FormInput
                      label="Display order"
                      type="number"
                      value={String(editData.displayOrder)}
                      onChange={(value) => { const parsed = Number(value); handleField('displayOrder', value === '' || Number.isNaN(parsed) ? 0 : parsed) }}
                      error={errors.displayOrder}
                      description="0–10000. Lower numbers appear first."
                    />
                    <p className="text-[11px] text-muted-foreground">At most one published provider can be featured. The backend unfeatures the previous provider in the same transaction.</p>
                  </FormSection>

                  <PreviewSection note="The mobile eSIM module at card scale. No comparison table in V1.">
                    <EsimModulePreview provider={editData} />
                  </PreviewSection>
                </fieldset>
              </EditorPanel>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete eSIM provider"
        description={`Delete "${selected?.name ?? editData?.name ?? 'this provider'}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

// ── Page ──

type MarketplaceTab = 'businesses' | 'stays' | 'esim'

const TABS: Array<{ key: MarketplaceTab; label: string; icon: React.ElementType }> = [
  { key: 'businesses', label: 'Businesses', icon: Buildings },
  { key: 'stays', label: 'Stays', icon: Bed },
  { key: 'esim', label: 'eSIM', icon: SimCard },
]

export const Route = createFileRoute('/_authenticated/marketplace')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'marketplace', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: MarketplacePage,
})

function MarketplacePage() {
  const context = useRouteContext({ from: '/_authenticated' })
  const canWrite = context.user?.role === 'super_admin' || context.user?.role === 'administrator'
  const [tab, setTab] = useState<MarketplaceTab>('businesses')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Marketplace</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Manage the partner businesses, stays, and featured eSIM provider that appear in the mobile marketplace.
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-1" role="tablist" aria-label="Marketplace sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold ${
              tab === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" weight={tab === item.key ? 'fill' : 'duotone'} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'businesses' ? <BusinessesTab canWrite={canWrite} /> : null}
      {tab === 'stays' ? <StaysTab canWrite={canWrite} /> : null}
      {tab === 'esim' ? <EsimTab canWrite={canWrite} /> : null}
    </div>
  )
}
